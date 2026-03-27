using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Strategies;

/// <summary>
/// AI-powered trading strategy using Claude to analyse market conditions.
/// Sends price data, portfolio state, and trade history to Claude for decisions.
/// </summary>
public class AiStrategy : ITradingStrategy
{
    public string Name => "ai";
    public string Description => "AI-powered analysis using Claude — sends market data for intelligent trade decisions";

    private readonly TradingConfig _config;
    private readonly HttpClient _http;
    private readonly ILogger<AiStrategy>? _logger;

    public AiStrategy(TradingConfig config, ILogger<AiStrategy>? logger = null)
    {
        _config = config;
        _logger = logger;
        _http = new HttpClient
        {
            BaseAddress = new Uri("https://api.anthropic.com"),
            Timeout = TimeSpan.FromSeconds(30)
        };
    }

    public async Task<TradeRecord> AnalyseAsync(
        decimal currentPrice,
        Portfolio portfolio,
        IReadOnlyList<TradeRecord> recentTrades)
    {
        if (string.IsNullOrEmpty(_config.AnthropicApiKey))
        {
            _logger?.LogWarning("No Anthropic API key — falling back to momentum logic");
            return FallbackAnalysis(currentPrice, recentTrades);
        }

        try
        {
            return await AskClaudeAsync(currentPrice, portfolio, recentTrades);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Claude API call failed — using fallback");
            return FallbackAnalysis(currentPrice, recentTrades);
        }
    }

    private async Task<TradeRecord> AskClaudeAsync(
        decimal currentPrice,
        Portfolio portfolio,
        IReadOnlyList<TradeRecord> recentTrades)
    {
        var last10 = recentTrades.TakeLast(10).Select(t => new
        {
            time = t.Timestamp.ToString("yyyy-MM-dd HH:mm"),
            action = t.Action.ToString(),
            pair = t.Pair,
            price = t.Price,
            amount = t.AmountUsd
        });

        var positions = portfolio.Positions.Select(p => new
        {
            symbol = p.Symbol,
            balance = p.Balance,
            value_usd = p.ValueUsd,
            allocation = p.AllocationPercent
        });

        var prompt = $@"You are a crypto trading AI assistant. Analyse the following market data and decide whether to BUY, SELL, or HOLD.

CURRENT PRICE: ETH/USD = ${currentPrice}
TRADE SIZE: ${_config.TradeAmountUsd} per trade
NETWORK: {_config.NetworkId}
STOP LOSS: {_config.StopLossPercent}%
TAKE PROFIT: {_config.TakeProfitPercent}%

PORTFOLIO:
{JsonConvert.SerializeObject(positions, Formatting.Indented)}
Total Value: ${portfolio.TotalValueUsd:F2}

RECENT TRADES:
{JsonConvert.SerializeObject(last10, Formatting.Indented)}

Rules:
- Only respond with a JSON object: {{""action"": ""BUY""|""SELL""|""HOLD"", ""confidence"": 0.0-1.0, ""reasoning"": ""short explanation""}}
- Consider recent price trends from trade history
- Be conservative — HOLD if unsure
- Never exceed the configured trade size
- Factor in stop-loss and take-profit levels";

        var requestBody = new
        {
            model = "claude-sonnet-4-20250514",
            max_tokens = 256,
            messages = new[] { new { role = "user", content = prompt } }
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "/v1/messages");
        request.Headers.Add("x-api-key", _config.AnthropicApiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");
        request.Content = new StringContent(
            JsonConvert.SerializeObject(requestBody), Encoding.UTF8, "application/json");

        var response = await _http.SendAsync(request);
        var content = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            _logger?.LogError("Claude API error {Status}: {Content}", response.StatusCode,
                content[..Math.Min(200, content.Length)]);
            return FallbackAnalysis(currentPrice, recentTrades);
        }

        var result = JObject.Parse(content);
        var text = result["content"]?[0]?["text"]?.ToString() ?? "";
        _logger?.LogInformation("Claude response: {Text}", text[..Math.Min(200, text.Length)]);

        var jsonStart = text.IndexOf('{');
        var jsonEnd = text.LastIndexOf('}');
        if (jsonStart >= 0 && jsonEnd > jsonStart)
        {
            var jsonStr = text[jsonStart..(jsonEnd + 1)];
            var decision = JObject.Parse(jsonStr);

            var actionStr = decision["action"]?.ToString()?.ToUpperInvariant() ?? "HOLD";
            var confidence = decision["confidence"]?.Value<double>() ?? 0.5;
            var reasoning = decision["reasoning"]?.ToString() ?? "";

            var action = actionStr switch
            {
                "BUY" => TradeAction.Buy,
                "SELL" => TradeAction.Sell,
                _ => TradeAction.Hold
            };

            if (confidence < 0.6 && action != TradeAction.Hold)
            {
                _logger?.LogInformation("Low confidence ({Confidence:F2}) — converting to HOLD", confidence);
                action = TradeAction.Hold;
                reasoning = $"Low confidence ({confidence:F2}): {reasoning}";
            }

            return new TradeRecord
            {
                Strategy = Name,
                Action = action,
                Pair = "ETH/USDC",
                Price = currentPrice,
                AmountUsd = action != TradeAction.Hold ? _config.TradeAmountUsd : 0,
                Quantity = action != TradeAction.Hold ? _config.TradeAmountUsd / currentPrice : 0,
                Network = _config.NetworkId,
                Notes = $"[AI confidence={confidence:F2}] {reasoning}"
            };
        }

        _logger?.LogWarning("Could not parse Claude response as JSON");
        return FallbackAnalysis(currentPrice, recentTrades);
    }

    private TradeRecord FallbackAnalysis(decimal currentPrice, IReadOnlyList<TradeRecord> recentTrades)
    {
        var lastTrade = recentTrades.LastOrDefault(t => t.Price > 0);
        var action = TradeAction.Hold;
        var notes = "AI unavailable — fallback momentum";

        if (lastTrade != null && lastTrade.Price > 0)
        {
            var change = ((currentPrice - lastTrade.Price) / lastTrade.Price) * 100;
            if (change > 2) { action = TradeAction.Buy; notes = $"Fallback: +{change:F1}% momentum buy"; }
            else if (change < -3) { action = TradeAction.Sell; notes = $"Fallback: {change:F1}% decline sell"; }
        }

        return new TradeRecord
        {
            Strategy = Name, Action = action, Pair = "ETH/USDC", Price = currentPrice,
            AmountUsd = action != TradeAction.Hold ? _config.TradeAmountUsd : 0,
            Network = _config.NetworkId, Notes = notes
        };
    }
}
