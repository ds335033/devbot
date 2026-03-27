using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Interfaces;

/// <summary>
/// Contract for trade execution — turns strategy signals into real trades.
/// </summary>
public interface ITradeExecutor
{
    Task<TradeRecord> ExecuteAsync(TradeRecord signal);
    Task<TradeRecord> MarketBuyAsync(string pair, decimal amountUsd);
    Task<TradeRecord> MarketSellAsync(string pair, decimal quantity);
}
