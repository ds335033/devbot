using System.Net.WebSockets;
using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using DevBot.Trading.CDP;

namespace DevBot.Trading.Core.Services;

/// <summary>
/// Real-time market data via WebSocket + REST fallback.
/// Streams live price ticks from Coinbase and maintains price cache.
/// </summary>
public class MarketDataService : IDisposable
{
    private readonly CoinbaseApiClient _api;
    private readonly ILogger<MarketDataService>? _logger;
    private ClientWebSocket? _ws;
    private CancellationTokenSource? _wsCts;
    private readonly Dictionary<string, decimal> _priceCache = new();
    private readonly Dictionary<string, List<PriceTick>> _priceHistory = new();
    private readonly object _lock = new();

    public event Action<string, decimal>? OnPriceUpdate;

    public MarketDataService(CoinbaseApiClient api, ILogger<MarketDataService>? logger = null)
    {
        _api = api;
        _logger = logger;
    }

    public async Task<decimal> GetPriceAsync(string pair = "ETH-USD")
    {
        lock (_lock)
        {
            if (_priceCache.TryGetValue(pair, out var cached))
                return cached;
        }

        var price = await _api.GetSpotPriceAsync(pair);
        if (price.HasValue)
            UpdatePrice(pair, price.Value);
        return price ?? 0;
    }

    public List<PriceTick> GetPriceHistory(string pair = "ETH-USD", int limit = 100)
    {
        lock (_lock)
        {
            if (_priceHistory.TryGetValue(pair, out var history))
                return history.TakeLast(limit).ToList();
            return new List<PriceTick>();
        }
    }

    public decimal GetSma(string pair, int periods)
    {
        var history = GetPriceHistory(pair, periods);
        return history.Count == 0 ? 0 : history.Average(t => t.Price);
    }

    public async Task StartWebSocketAsync(string[] pairs, CancellationToken cancellationToken = default)
    {
        _wsCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        _ws = new ClientWebSocket();

        try
        {
            await _ws.ConnectAsync(new Uri("wss://ws-feed.exchange.coinbase.com"), _wsCts.Token);
            _logger?.LogInformation("WebSocket connected to Coinbase");

            var subscribe = new
            {
                type = "subscribe",
                product_ids = pairs.Select(p => p.Replace("/", "-")).ToArray(),
                channels = new[] { "ticker" }
            };

            var subscribeBytes = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(subscribe));
            await _ws.SendAsync(subscribeBytes, WebSocketMessageType.Text, true, _wsCts.Token);
            _logger?.LogInformation("Subscribed to: {Pairs}", string.Join(", ", pairs));

            var buffer = new byte[4096];
            while (!_wsCts.Token.IsCancellationRequested && _ws.State == WebSocketState.Open)
            {
                var result = await _ws.ReceiveAsync(buffer, _wsCts.Token);
                if (result.MessageType == WebSocketMessageType.Close) break;
                ProcessWebSocketMessage(Encoding.UTF8.GetString(buffer, 0, result.Count));
            }
        }
        catch (OperationCanceledException)
        {
            _logger?.LogInformation("WebSocket disconnected");
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "WebSocket error");
        }
    }

    public async Task StartPollingAsync(string[] pairs, int intervalSeconds = 30, CancellationToken cancellationToken = default)
    {
        _logger?.LogInformation("Starting price polling every {Interval}s", intervalSeconds);

        while (!cancellationToken.IsCancellationRequested)
        {
            foreach (var pair in pairs)
            {
                try
                {
                    var dashPair = pair.Replace("/", "-");
                    var price = await _api.GetSpotPriceAsync(dashPair);
                    if (price.HasValue) UpdatePrice(dashPair, price.Value);
                }
                catch (Exception ex)
                {
                    _logger?.LogWarning(ex, "Failed to poll price for {Pair}", pair);
                }
            }

            try { await Task.Delay(TimeSpan.FromSeconds(intervalSeconds), cancellationToken); }
            catch (OperationCanceledException) { break; }
        }
    }

    private void ProcessWebSocketMessage(string message)
    {
        try
        {
            var msg = JObject.Parse(message);
            if (msg["type"]?.ToString() == "ticker")
            {
                var productId = msg["product_id"]?.ToString();
                if (productId != null && decimal.TryParse(msg["price"]?.ToString(), out var price))
                    UpdatePrice(productId, price);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogDebug(ex, "Failed to parse WebSocket message");
        }
    }

    private void UpdatePrice(string pair, decimal price)
    {
        lock (_lock)
        {
            _priceCache[pair] = price;
            if (!_priceHistory.ContainsKey(pair))
                _priceHistory[pair] = new List<PriceTick>();

            _priceHistory[pair].Add(new PriceTick { Pair = pair, Price = price, Timestamp = DateTime.UtcNow });

            if (_priceHistory[pair].Count > 1000)
                _priceHistory[pair].RemoveRange(0, _priceHistory[pair].Count - 1000);
        }

        OnPriceUpdate?.Invoke(pair, price);
    }

    public void Dispose()
    {
        _wsCts?.Cancel();
        _ws?.Dispose();
        _wsCts?.Dispose();
        GC.SuppressFinalize(this);
    }
}

public class PriceTick
{
    public string Pair { get; set; } = "";
    public decimal Price { get; set; }
    public DateTime Timestamp { get; set; }
}
