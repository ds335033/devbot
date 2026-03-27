using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;

namespace DevBot.Trading.Core.Strategies;

/// <summary>
/// Dollar-Cost Averaging Strategy: Buy fixed amount at regular intervals.
/// The simplest and most consistent strategy — removes emotion from trading.
/// </summary>
public class DcaStrategy : ITradingStrategy
{
    private readonly TradingConfig _config;
    private readonly ILogger<DcaStrategy>? _logger;

    public string Name => "dca";
    public string Description => $"Dollar-cost average ${_config.TradeAmountUsd} every {_config.DcaIntervalHours}h.";

    public DcaStrategy(TradingConfig config, ILogger<DcaStrategy>? logger = null)
    {
        _config = config;
        _logger = logger;
    }

    public Task<TradeRecord> AnalyseAsync(
        decimal currentPrice, Portfolio portfolio, IReadOnlyList<TradeRecord> recentTrades)
    {
        // Check if enough time has passed since last DCA buy
        var lastDcaBuy = recentTrades
            .Where(t => t.Strategy == Name && t.Action == TradeAction.Buy && t.Status == TradeStatus.Executed)
            .OrderByDescending(t => t.Timestamp)
            .FirstOrDefault();

        if (lastDcaBuy != null)
        {
            var elapsed = DateTime.UtcNow - lastDcaBuy.Timestamp;
            var interval = TimeSpan.FromHours(_config.DcaIntervalHours);

            if (elapsed < interval)
            {
                var remaining = interval - elapsed;
                _logger?.LogInformation("DCA: Next buy in {Remaining}", remaining.ToString(@"hh\:mm\:ss"));
                return Task.FromResult(new TradeRecord
                {
                    Strategy = Name,
                    Action = TradeAction.Hold,
                    Price = currentPrice,
                    Notes = $"Next DCA buy in {remaining:hh\\:mm\\:ss}"
                });
            }
        }

        // Time to buy!
        var trade = new TradeRecord
        {
            Strategy = Name,
            Action = TradeAction.Buy,
            Pair = "ETH/USDC",
            AmountUsd = _config.TradeAmountUsd,
            Price = currentPrice,
            Quantity = _config.TradeAmountUsd / currentPrice,
            Network = _config.NetworkId,
            Notes = $"Scheduled DCA buy: ${_config.TradeAmountUsd} of ETH @ ${currentPrice:F2}"
        };

        _logger?.LogInformation("DCA: Executing buy — ${Amount} @ ${Price}", _config.TradeAmountUsd, currentPrice);
        return Task.FromResult(trade);
    }
}
