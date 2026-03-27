using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Interfaces;

/// <summary>
/// Contract for a trading strategy.
/// Each strategy analyses market conditions and returns a trade decision.
/// </summary>
public interface ITradingStrategy
{
    /// <summary>
    /// Strategy name identifier.
    /// </summary>
    string Name { get; }

    /// <summary>
    /// Human-readable description.
    /// </summary>
    string Description { get; }

    /// <summary>
    /// Analyse market data and return a trade decision.
    /// </summary>
    /// <param name="currentPrice">Current spot price of the asset.</param>
    /// <param name="portfolio">Current portfolio state.</param>
    /// <param name="recentTrades">Recent trade history.</param>
    /// <returns>A trade record (Action=Hold means no trade).</returns>
    Task<TradeRecord> AnalyseAsync(
        decimal currentPrice,
        Portfolio portfolio,
        IReadOnlyList<TradeRecord> recentTrades);
}
