using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Interfaces;

/// <summary>
/// Contract for persisting trade records.
/// </summary>
public interface ITradeLogger
{
    Task<IReadOnlyList<TradeRecord>> GetAllTradesAsync();
    Task<IReadOnlyList<TradeRecord>> GetTodaysTradesAsync();
    Task LogTradeAsync(TradeRecord trade);
    Task<Portfolio> LoadPortfolioAsync();
    Task SavePortfolioAsync(Portfolio portfolio);
}
