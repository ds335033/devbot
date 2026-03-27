using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Services;

/// <summary>
/// Persists trade records and portfolio snapshots to JSON files.
/// Mirrors Python bot's data/ directory structure.
/// </summary>
public class JsonTradeLogger : ITradeLogger
{
    private readonly string _tradesFile;
    private readonly string _portfolioFile;
    private readonly ILogger<JsonTradeLogger>? _logger;
    private static readonly object _lock = new();

    public JsonTradeLogger(TradingConfig config, ILogger<JsonTradeLogger>? logger = null)
    {
        _logger = logger;
        var dataDir = Path.GetFullPath(config.DataDirectory);
        Directory.CreateDirectory(dataDir);
        _tradesFile = Path.Combine(dataDir, "trades.json");
        _portfolioFile = Path.Combine(dataDir, "portfolio.json");
    }

    public Task<IReadOnlyList<TradeRecord>> GetAllTradesAsync()
    {
        var trades = LoadTrades();
        return Task.FromResult<IReadOnlyList<TradeRecord>>(trades);
    }

    public Task<IReadOnlyList<TradeRecord>> GetTodaysTradesAsync()
    {
        var trades = LoadTrades()
            .Where(t => t.Timestamp.Date == DateTime.UtcNow.Date)
            .ToList();
        return Task.FromResult<IReadOnlyList<TradeRecord>>(trades);
    }

    public Task LogTradeAsync(TradeRecord trade)
    {
        lock (_lock)
        {
            var trades = LoadTrades();
            trades.Add(trade);
            SaveTrades(trades);
        }

        _logger?.LogInformation("Trade logged: {Trade}", trade);
        return Task.CompletedTask;
    }

    public Task<Portfolio> LoadPortfolioAsync()
    {
        try
        {
            if (File.Exists(_portfolioFile))
            {
                var json = File.ReadAllText(_portfolioFile);
                var portfolio = JsonConvert.DeserializeObject<Portfolio>(json);
                if (portfolio != null) return Task.FromResult(portfolio);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to load portfolio, returning empty.");
        }

        return Task.FromResult(new Portfolio());
    }

    public Task SavePortfolioAsync(Portfolio portfolio)
    {
        portfolio.Timestamp = DateTime.UtcNow;
        var json = JsonConvert.SerializeObject(portfolio, Formatting.Indented);
        File.WriteAllText(_portfolioFile, json);
        _logger?.LogDebug("Portfolio saved.");
        return Task.CompletedTask;
    }

    private List<TradeRecord> LoadTrades()
    {
        try
        {
            if (File.Exists(_tradesFile))
            {
                var json = File.ReadAllText(_tradesFile);
                return JsonConvert.DeserializeObject<List<TradeRecord>>(json) ?? new();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Failed to load trades, returning empty.");
        }
        return new();
    }

    private void SaveTrades(List<TradeRecord> trades)
    {
        var json = JsonConvert.SerializeObject(trades, Formatting.Indented);
        File.WriteAllText(_tradesFile, json);
    }
}
