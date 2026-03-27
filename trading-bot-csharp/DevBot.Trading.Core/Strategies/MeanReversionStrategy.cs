using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Strategies;

/// <summary>
/// Mean Reversion Strategy: Buy dips, sell rallies based on moving averages.
/// Buys when price is >2% below 20-period SMA, sells when >2% above.
/// </summary>
public class MeanReversionStrategy : ITradingStrategy
{
    private readonly TradingConfig _config;
    private readonly ILogger<MeanReversionStrategy>? _logger;
    private readonly List<decimal> _priceHistory = new();
    private const int SmaPeriod = 20;
    private const decimal DeviationThreshold = 2.0m; // 2% deviation

    public string Name => "mean_reversion";
    public string Description => "Buy dips below SMA, sell rallies above SMA.";

    public MeanReversionStrategy(TradingConfig config, ILogger<MeanReversionStrategy>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public Task<TradeRecord> AnalyseAsync(
        decimal currentPrice, Portfolio portfolio, IReadOnlyList<TradeRecord> recentTrades)
    {
        _priceHistory.Add(currentPrice);

        // Need enough data for SMA calculation
        if (_priceHistory.Count < SmaPeriod)
        {
            _logger?.LogInformation("MeanReversion: Collecting data ({Count}/{Period})...",
                _priceHistory.Count, SmaPeriod);
            return Task.FromResult(new TradeRecord
            {
                Strategy = Name,
                Action = TradeAction.Hold,
                Price = currentPrice,
                Notes = $"Building SMA: {_priceHistory.Count}/{SmaPeriod} periods"
            });
        }

        // Keep last 50 data points
        if (_priceHistory.Count > 50)
            _priceHistory.RemoveAt(0);

        // Calculate 20-period Simple Moving Average
        var sma = _priceHistory.TakeLast(SmaPeriod).Average();
        var deviationPercent = (currentPrice - sma) / sma * 100;

        TradeAction action;
        string notes;

        if (deviationPercent < -DeviationThreshold)
        {
            action = TradeAction.Buy;
            notes = $"Price ${currentPrice:F2} is {deviationPercent:F2}% below SMA ${sma:F2} — buying the dip";
        }
        else if (deviationPercent > DeviationThreshold)
        {
            action = TradeAction.Sell;
            notes = $"Price ${currentPrice:F2} is +{deviationPercent:F2}% above SMA ${sma:F2} — selling the rally";
        }
        else
        {
            action = TradeAction.Hold;
            notes = $"Price ${currentPrice:F2} within range of SMA ${sma:F2} ({deviationPercent:F2}%)";
        }

        var trade = new TradeRecord
        {
            Strategy = Name,
            Action = action,
            Pair = "ETH/USDC",
            AmountUsd = _config.TradeAmountUsd,
            Price = currentPrice,
            Quantity = action != TradeAction.Hold ? _config.TradeAmountUsd / currentPrice : 0,
            Network = _config.NetworkId,
            Notes = notes
        };

        _logger?.LogInformation("MeanReversion: {Action} — {Notes}", action, notes);
        return Task.FromResult(trade);
    }
}
