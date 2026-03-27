using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Strategies;

/// <summary>
/// Momentum Strategy: Buy when price is trending up, sell when reversing.
/// Analyses recent price history to detect bullish/bearish momentum.
/// </summary>
public class MomentumStrategy : ITradingStrategy
{
    private readonly TradingConfig _config;
    private readonly ILogger<MomentumStrategy>? _logger;
    private readonly List<decimal> _priceHistory = new();

    public string Name => "momentum";
    public string Description => "Buy when price is trending up, sell when reversing.";

    public MomentumStrategy(TradingConfig config, ILogger<MomentumStrategy>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public Task<TradeRecord> AnalyseAsync(
        decimal currentPrice, Portfolio portfolio, IReadOnlyList<TradeRecord> recentTrades)
    {
        _priceHistory.Add(currentPrice);

        // Need at least 3 price points for momentum analysis
        if (_priceHistory.Count < 3)
        {
            _logger?.LogInformation("Momentum: Collecting price data ({Count}/3)...", _priceHistory.Count);
            return Task.FromResult(new TradeRecord
            {
                Strategy = Name,
                Action = TradeAction.Hold,
                Price = currentPrice,
                Notes = $"Collecting price data ({_priceHistory.Count}/3)"
            });
        }

        // Keep last 20 data points
        if (_priceHistory.Count > 20)
            _priceHistory.RemoveAt(0);

        var recent = _priceHistory.TakeLast(3).ToList();
        var isUptrend = recent[2] > recent[1] && recent[1] > recent[0];
        var isDowntrend = recent[2] < recent[1] && recent[1] < recent[0];
        var changePercent = (recent[2] - recent[0]) / recent[0] * 100;

        // Check daily trade limit
        var todayTradeCount = recentTrades.Count(t =>
            t.Timestamp.Date == DateTime.UtcNow.Date && t.Action != TradeAction.Hold);

        if (todayTradeCount >= _config.MaxDailyTrades)
        {
            return Task.FromResult(new TradeRecord
            {
                Strategy = Name,
                Action = TradeAction.Hold,
                Price = currentPrice,
                Notes = $"Max daily trades ({_config.MaxDailyTrades}) reached"
            });
        }

        TradeAction action;
        string notes;

        if (isUptrend && changePercent > 0.5m)
        {
            action = TradeAction.Buy;
            notes = $"Bullish momentum detected: +{changePercent:F2}% over 3 periods";
        }
        else if (isDowntrend && changePercent < -0.5m)
        {
            action = TradeAction.Sell;
            notes = $"Bearish reversal detected: {changePercent:F2}% over 3 periods";
        }
        else
        {
            action = TradeAction.Hold;
            notes = $"No clear momentum signal: {changePercent:F2}%";
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

        _logger?.LogInformation("Momentum: {Action} — {Notes}", action, notes);
        return Task.FromResult(trade);
    }
}
