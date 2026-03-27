using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Services;

/// <summary>
/// Risk management — enforces stop-loss, take-profit, daily limits, and position sizing.
/// </summary>
public class RiskManager
{
    private readonly TradingConfig _config;
    private readonly ITradeLogger _tradeLogger;
    private readonly ILogger<RiskManager>? _logger;

    public RiskManager(TradingConfig config, ITradeLogger tradeLogger, ILogger<RiskManager>? logger = null)
    {
        _config = config;
        _tradeLogger = tradeLogger;
        _logger = logger;
    }

    public async Task<(bool Approved, string Reason)> ValidateTradeAsync(TradeRecord signal, Portfolio portfolio)
    {
        // Rule 1: Daily trade limit
        var todayTrades = await _tradeLogger.GetTodaysTradesAsync();
        var executedToday = todayTrades.Count(t => t.Action != TradeAction.Hold);
        if (executedToday >= _config.MaxDailyTrades)
            return (false, $"Daily trade limit reached: {executedToday}/{_config.MaxDailyTrades}");

        // Rule 2: Trade size validation
        if (signal.AmountUsd > _config.TradeAmountUsd * 2)
            return (false, $"Trade amount ${signal.AmountUsd} exceeds 2x configured size ${_config.TradeAmountUsd}");

        // Rule 3: Stop-loss check
        if (signal.Action == TradeAction.Buy && signal.Price > 0)
        {
            var recentTrades = await _tradeLogger.GetAllTradesAsync();
            var lastBuy = recentTrades.LastOrDefault(t => t.Action == TradeAction.Buy && t.Price > 0);
            if (lastBuy != null)
            {
                var drawdown = ((lastBuy.Price - signal.Price) / lastBuy.Price) * 100;
                if (drawdown > _config.StopLossPercent)
                {
                    _logger?.LogWarning("Stop-loss triggered: {Drawdown:F1}% decline", drawdown);
                    return (false, $"Stop-loss: {drawdown:F1}% decline (limit: {_config.StopLossPercent}%)");
                }
            }
        }

        // Rule 4: Take-profit auto-sell recommendation
        if (signal.Action == TradeAction.Hold)
        {
            var recentTrades = await _tradeLogger.GetAllTradesAsync();
            var lastBuy = recentTrades.LastOrDefault(t => t.Action == TradeAction.Buy && t.Price > 0);
            if (lastBuy != null && signal.Price > 0)
            {
                var gain = ((signal.Price - lastBuy.Price) / lastBuy.Price) * 100;
                if (gain >= _config.TakeProfitPercent)
                {
                    _logger?.LogInformation("Take-profit triggered: {Gain:F1}% gain", gain);
                    return (true, $"TAKE_PROFIT: {gain:F1}% gain — recommend SELL");
                }
            }
        }

        // Rule 5: Minimum position for sells
        if (signal.Action == TradeAction.Sell)
        {
            var asset = signal.Pair.Split('/')[0];
            var position = portfolio.Positions.FirstOrDefault(p =>
                p.Symbol.Equals(asset, StringComparison.OrdinalIgnoreCase));
            if (position == null || position.Balance <= 0)
                return (false, $"No {asset} position to sell");
        }

        return (true, "Trade approved");
    }

    public decimal CalculatePositionSize(Portfolio portfolio, decimal currentPrice)
    {
        var portfolioValue = portfolio.TotalValueUsd;
        var maxPositionPct = 0.10m;
        var maxByPortfolio = portfolioValue * maxPositionPct;
        return Math.Min(_config.TradeAmountUsd, maxByPortfolio > 0 ? maxByPortfolio : _config.TradeAmountUsd);
    }

    public async Task<RiskSummary> GetDailySummaryAsync()
    {
        var allTrades = await _tradeLogger.GetAllTradesAsync();
        var today = allTrades.Where(t => t.Timestamp.Date == DateTime.UtcNow.Date).ToList();

        return new RiskSummary
        {
            TotalTradesToday = today.Count(t => t.Action != TradeAction.Hold),
            MaxTradesAllowed = _config.MaxDailyTrades,
            VolumeToday = today.Sum(t => t.AmountUsd),
            BuysToday = today.Count(t => t.Action == TradeAction.Buy),
            SellsToday = today.Count(t => t.Action == TradeAction.Sell),
            FailedToday = today.Count(t => t.Status == TradeStatus.Failed),
            StopLossPercent = _config.StopLossPercent,
            TakeProfitPercent = _config.TakeProfitPercent
        };
    }
}

public class RiskSummary
{
    public int TotalTradesToday { get; set; }
    public int MaxTradesAllowed { get; set; }
    public decimal VolumeToday { get; set; }
    public int BuysToday { get; set; }
    public int SellsToday { get; set; }
    public int FailedToday { get; set; }
    public decimal StopLossPercent { get; set; }
    public decimal TakeProfitPercent { get; set; }
    public bool AtDailyLimit => TotalTradesToday >= MaxTradesAllowed;
    public int RemainingTrades => Math.Max(0, MaxTradesAllowed - TotalTradesToday);
}
