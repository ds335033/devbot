using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Strategies;

/// <summary>
/// Rebalance Strategy: Maintain target portfolio allocation.
/// Target: 50% ETH, 30% BTC, 20% USDC. Rebalance when >5% drift.
/// </summary>
public class RebalanceStrategy : ITradingStrategy
{
    private readonly TradingConfig _config;
    private readonly ILogger<RebalanceStrategy>? _logger;

    private static readonly Dictionary<string, decimal> TargetAllocations = new()
    {
        { "ETH", 50m },
        { "BTC", 30m },
        { "USDC", 20m }
    };

    private const decimal DriftThreshold = 5m; // 5% drift triggers rebalance

    public string Name => "rebalance";
    public string Description => "Maintain 50% ETH, 30% BTC, 20% USDC allocation.";

    public RebalanceStrategy(TradingConfig config, ILogger<RebalanceStrategy>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public Task<TradeRecord> AnalyseAsync(
        decimal currentPrice, Portfolio portfolio, IReadOnlyList<TradeRecord> recentTrades)
    {
        if (portfolio.Positions.Count == 0)
        {
            return Task.FromResult(new TradeRecord
            {
                Strategy = Name,
                Action = TradeAction.Hold,
                Price = currentPrice,
                Notes = "No positions to rebalance"
            });
        }

        portfolio.RecalculateAllocations();

        // Find the position with the largest drift from target
        decimal maxDrift = 0;
        string? driftAsset = null;
        bool overweight = false;

        foreach (var (symbol, target) in TargetAllocations)
        {
            var position = portfolio.Positions.FirstOrDefault(p =>
                p.Symbol.Equals(symbol, StringComparison.OrdinalIgnoreCase));

            var actual = position?.AllocationPercent ?? 0;
            var drift = actual - target;

            if (Math.Abs(drift) > Math.Abs(maxDrift))
            {
                maxDrift = drift;
                driftAsset = symbol;
                overweight = drift > 0;
            }
        }

        if (driftAsset == null || Math.Abs(maxDrift) < DriftThreshold)
        {
            var allocDisplay = portfolio.Positions
                .Select(p => $"{p.Symbol}: {p.AllocationPercent:F1}%")
                .Aggregate((a, b) => $"{a}, {b}");

            return Task.FromResult(new TradeRecord
            {
                Strategy = Name,
                Action = TradeAction.Hold,
                Price = currentPrice,
                Notes = $"Portfolio balanced ({allocDisplay}). No rebalance needed."
            });
        }

        // Rebalance: sell overweight, buy underweight
        var action = overweight ? TradeAction.Sell : TradeAction.Buy;
        var pair = driftAsset == "USDC" ? "USDC" : $"{driftAsset}/USDC";
        var notes = $"{driftAsset} is {(overweight ? "overweight" : "underweight")} by {Math.Abs(maxDrift):F1}% " +
                    $"(target: {TargetAllocations[driftAsset]}%) — {action}ing to rebalance";

        var trade = new TradeRecord
        {
            Strategy = Name,
            Action = action,
            Pair = pair,
            AmountUsd = Math.Min(_config.TradeAmountUsd, portfolio.TotalValueUsd * Math.Abs(maxDrift) / 100),
            Price = currentPrice,
            Network = _config.NetworkId,
            Notes = notes
        };

        trade.Quantity = trade.AmountUsd / currentPrice;

        _logger?.LogInformation("Rebalance: {Action} {Asset} — {Notes}", action, driftAsset, notes);
        return Task.FromResult(trade);
    }
}
