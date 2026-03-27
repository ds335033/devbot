using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Factories;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;
using DevBot.Trading.CDP;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.Core.Services;

/// <summary>
/// Core trading engine — orchestrates strategies, API calls, and trade execution.
/// The C# equivalent of our Python bot's run_strategy() + interactive_mode().
/// </summary>
public class TradingEngine
{
    private readonly TradingConfig _config;
    private readonly CoinbaseApiClient _apiClient;
    private readonly ITradeLogger _tradeLogger;
    private readonly ILogger<TradingEngine>? _logger;
    private ITradingStrategy _activeStrategy;
    private readonly Dictionary<string, ITradingStrategy> _strategies;

    public TradingConfig Config => _config;
    public ITradingStrategy ActiveStrategy => _activeStrategy;
    public IReadOnlyDictionary<string, ITradingStrategy> Strategies => _strategies;

    public TradingEngine(
        TradingConfig config,
        CoinbaseApiClient apiClient,
        ITradeLogger tradeLogger,
        ILoggerFactory? loggerFactory = null)
    {
        _config = config;
        _apiClient = apiClient;
        _tradeLogger = tradeLogger;
        _logger = loggerFactory?.CreateLogger<TradingEngine>();

        // Create all strategies
        _strategies = StrategyFactory.CreateAll(config, loggerFactory);
        _activeStrategy = _strategies[config.Strategy];

        _logger?.LogInformation("Trading engine initialised — Strategy: {Strategy}, Network: {Network}",
            config.Strategy, config.NetworkId);
    }

    /// <summary>
    /// Switch the active trading strategy.
    /// </summary>
    public bool SwitchStrategy(string strategyName)
    {
        if (_strategies.TryGetValue(strategyName.ToLowerInvariant(), out var strategy))
        {
            _activeStrategy = strategy;
            _config.Strategy = strategyName;
            _logger?.LogInformation("Switched to strategy: {Strategy}", strategyName);
            return true;
        }
        return false;
    }

    /// <summary>
    /// Get the current ETH/USD spot price from Coinbase.
    /// </summary>
    public async Task<decimal> GetCurrentPriceAsync(string pair = "ETH-USD")
    {
        var price = await _apiClient.GetSpotPriceAsync(pair);
        return price ?? throw new InvalidOperationException($"Failed to fetch price for {pair}");
    }

    /// <summary>
    /// Get all wallet accounts from Coinbase.
    /// </summary>
    public async Task<Portfolio> GetPortfolioAsync()
    {
        try
        {
            var accounts = await _apiClient.GetAccountsAsync();
            var portfolio = new Portfolio
            {
                Network = _config.NetworkId,
                Timestamp = DateTime.UtcNow
            };

            var data = accounts?["data"];
            if (data != null)
            {
                foreach (var account in data)
                {
                    var balance = account["balance"];
                    if (balance != null)
                    {
                        var amount = decimal.Parse(balance["amount"]?.ToString() ?? "0");
                        if (amount > 0)
                        {
                            var symbol = balance["currency"]?.ToString() ?? "???";
                            var price = await TryGetPrice(symbol);

                            portfolio.Positions.Add(new PortfolioPosition
                            {
                                Symbol = symbol,
                                Balance = amount,
                                PriceUsd = price
                            });
                        }
                    }
                }
            }

            portfolio.RecalculateAllocations();
            await _tradeLogger.SavePortfolioAsync(portfolio);
            return portfolio;
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Failed to fetch portfolio");
            return await _tradeLogger.LoadPortfolioAsync();
        }
    }

    /// <summary>
    /// Execute one round of the active trading strategy.
    /// </summary>
    public async Task<TradeRecord> ExecuteStrategyAsync()
    {
        _logger?.LogInformation("Executing strategy: {Strategy}", _activeStrategy.Name);

        // Check daily trade limit
        var todayTrades = await _tradeLogger.GetTodaysTradesAsync();
        var executedToday = todayTrades.Count(t => t.Action != TradeAction.Hold);
        if (executedToday >= _config.MaxDailyTrades)
        {
            _logger?.LogWarning("Daily trade limit reached ({Count}/{Max})", executedToday, _config.MaxDailyTrades);
            return new TradeRecord
            {
                Strategy = _activeStrategy.Name,
                Action = TradeAction.Hold,
                Notes = $"Daily limit reached: {executedToday}/{_config.MaxDailyTrades}"
            };
        }

        // Get current price and portfolio
        var price = await GetCurrentPriceAsync();
        var portfolio = await GetPortfolioAsync();
        var recentTrades = await _tradeLogger.GetAllTradesAsync();

        // Run strategy analysis
        var trade = await _activeStrategy.AnalyseAsync(price, portfolio, recentTrades);

        // Log the trade decision
        await _tradeLogger.LogTradeAsync(trade);

        if (trade.Action != TradeAction.Hold)
        {
            _logger?.LogInformation("Trade signal: {Trade}", trade);

            if (_config.IsMainnet)
                _logger?.LogWarning("⚠️  MAINNET — This is REAL MONEY! Trade: {Trade}", trade);
        }

        return trade;
    }

    /// <summary>
    /// Run the DCA strategy on a loop.
    /// </summary>
    public async Task RunDcaLoopAsync(CancellationToken cancellationToken)
    {
        SwitchStrategy("dca");
        _logger?.LogInformation("Starting DCA loop — ${Amount} every {Hours}h",
            _config.TradeAmountUsd, _config.DcaIntervalHours);

        while (!cancellationToken.IsCancellationRequested)
        {
            try
            {
                var trade = await ExecuteStrategyAsync();
                _logger?.LogInformation("DCA result: {Trade}", trade);

                var delay = TimeSpan.FromHours(_config.DcaIntervalHours);
                _logger?.LogInformation("Next DCA in {Delay}", delay);
                await Task.Delay(delay, cancellationToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger?.LogError(ex, "DCA cycle error — retrying in 5 minutes");
                await Task.Delay(TimeSpan.FromMinutes(5), cancellationToken);
            }
        }
    }

    /// <summary>
    /// Get status summary without executing trades.
    /// </summary>
    public async Task<string> GetStatusAsync()
    {
        var allTrades = await _tradeLogger.GetAllTradesAsync();
        var todayTrades = allTrades.Where(t => t.Timestamp.Date == DateTime.UtcNow.Date).ToList();
        var totalVolume = allTrades.Sum(t => t.AmountUsd);

        return $"""
            ══════════════════════════════════
              DevBot Trading Bot (C#) — Status
            ══════════════════════════════════
              Network:     {_config.NetworkId}
              Strategy:    {_config.Strategy}
              Trade Size:  ${_config.TradeAmountUsd}
              Max Daily:   {_config.MaxDailyTrades}
              Stop Loss:   {_config.StopLossPercent}%
              Take Profit: {_config.TakeProfitPercent}%

              Total Trades: {allTrades.Count}
              Today:        {todayTrades.Count}
              Volume:       ${totalVolume:N2}
            ══════════════════════════════════
            """;
    }

    private async Task<decimal> TryGetPrice(string symbol)
    {
        try
        {
            if (symbol.Equals("USD", StringComparison.OrdinalIgnoreCase) ||
                symbol.Equals("USDC", StringComparison.OrdinalIgnoreCase) ||
                symbol.Equals("USDT", StringComparison.OrdinalIgnoreCase))
                return 1m;

            var price = await _apiClient.GetSpotPriceAsync($"{symbol}-USD");
            return price ?? 0;
        }
        catch
        {
            return 0;
        }
    }
}
