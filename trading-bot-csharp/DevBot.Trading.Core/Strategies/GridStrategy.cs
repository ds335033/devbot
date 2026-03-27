using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Strategies;

/// <summary>
/// Grid Trading Strategy: Place buy/sell orders at price grid levels.
/// Sets buy orders at 2% intervals below current price, sell at 2% above.
/// </summary>
public class GridStrategy : ITradingStrategy
{
    private readonly TradingConfig _config;
    private readonly ILogger<GridStrategy>? _logger;
    private decimal _gridBasePrice;
    private const decimal GridSpacing = 0.02m; // 2% grid spacing
    private const int GridLevels = 5;

    public string Name => "grid";
    public string Description => "Buy/sell at 2% grid intervals.";

    public GridStrategy(TradingConfig config, ILogger<GridStrategy>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public Task<TradeRecord> AnalyseAsync(
        decimal currentPrice, Portfolio portfolio, IReadOnlyList<TradeRecord> recentTrades)
    {
        // Initialize grid base price
        if (_gridBasePrice == 0)
        {
            _gridBasePrice = currentPrice;
            _logger?.LogInformation("Grid: Base price set at ${Price}", currentPrice);
        }

        // Calculate grid levels
        var buyLevels = Enumerable.Range(1, GridLevels)
            .Select(i => _gridBasePrice * (1 - GridSpacing * i))
            .ToList();

        var sellLevels = Enumerable.Range(1, GridLevels)
            .Select(i => _gridBasePrice * (1 + GridSpacing * i))
            .ToList();

        // Find nearest grid level
        var nearestBuy = buyLevels.OrderBy(l => Math.Abs(l - currentPrice)).First();
        var nearestSell = sellLevels.OrderBy(l => Math.Abs(l - currentPrice)).First();

        var buyDistance = Math.Abs(currentPrice - nearestBuy) / currentPrice * 100;
        var sellDistance = Math.Abs(currentPrice - nearestSell) / currentPrice * 100;

        TradeAction action;
        string notes;

        // If price is within 0.5% of a grid level, execute
        if (buyDistance < 0.5m && currentPrice < _gridBasePrice)
        {
            action = TradeAction.Buy;
            notes = $"Price ${currentPrice:F2} hit buy grid at ${nearestBuy:F2}";
        }
        else if (sellDistance < 0.5m && currentPrice > _gridBasePrice)
        {
            action = TradeAction.Sell;
            notes = $"Price ${currentPrice:F2} hit sell grid at ${nearestSell:F2}";
        }
        else
        {
            action = TradeAction.Hold;
            var gridDisplay = string.Join(" | ", buyLevels.Take(3).Select(l => $"B${l:F0}"));
            gridDisplay += $" | [${currentPrice:F0}] | ";
            gridDisplay += string.Join(" | ", sellLevels.Take(3).Select(l => $"S${l:F0}"));
            notes = $"Between grid levels: {gridDisplay}";
        }

        // Update grid base if price moved significantly (>10%)
        if (Math.Abs(currentPrice - _gridBasePrice) / _gridBasePrice > 0.10m)
        {
            _gridBasePrice = currentPrice;
            notes += " [Grid recentred]";
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

        _logger?.LogInformation("Grid: {Action} — {Notes}", action, notes);
        return Task.FromResult(trade);
    }
}
