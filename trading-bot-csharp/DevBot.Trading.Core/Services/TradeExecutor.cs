using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Models;
using DevBot.Trading.CDP;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.Core.Services;

/// <summary>
/// Executes actual trades via Coinbase CDP API.
/// Converts strategy signals into real on-chain transactions.
/// </summary>
public class TradeExecutor : ITradeExecutor
{
    private readonly CoinbaseApiClient _api;
    private readonly IWalletService _walletService;
    private readonly TradingConfig _config;
    private readonly ITradeLogger _tradeLogger;
    private readonly ILogger<TradeExecutor>? _log;

    public TradeExecutor(
        CoinbaseApiClient api,
        IWalletService walletService,
        TradingConfig config,
        ITradeLogger tradeLogger,
        ILogger<TradeExecutor>? log = null)
    {
        _api = api;
        _walletService = walletService;
        _config = config;
        _tradeLogger = tradeLogger;
        _log = log;
    }

    public async Task<TradeRecord> ExecuteAsync(TradeRecord signal)
    {
        if (signal.Action == TradeAction.Hold)
        {
            signal.Status = TradeStatus.Executed;
            signal.Notes = "HOLD — no action taken";
            return signal;
        }

        var walletId = _walletService.ActiveWalletId;
        if (string.IsNullOrEmpty(walletId))
        {
            signal.Status = TradeStatus.Failed;
            signal.Notes = "No active wallet set";
            _log?.LogError("Trade failed: no active wallet");
            return signal;
        }

        try
        {
            var pair = signal.Pair.Replace("/", "-");
            var price = await _api.GetSpotPriceAsync(pair);
            if (price == null || price <= 0)
            {
                signal.Status = TradeStatus.Failed;
                signal.Notes = $"Could not fetch price for {pair}";
                return signal;
            }

            signal.Price = price.Value;
            signal.AmountUsd = _config.TradeAmountUsd;
            signal.Quantity = _config.TradeAmountUsd / price.Value;
            signal.Network = _config.NetworkId;

            _log?.LogInformation("{Action} {Pair}: ${Amount} @ ${Price} (qty: {Qty})",
                signal.Action, signal.Pair, signal.AmountUsd, signal.Price, signal.Quantity);

            if (_config.IsMainnet)
                _log?.LogWarning("MAINNET TRADE: {Action} ${Amount} of {Pair}", signal.Action, signal.AmountUsd, signal.Pair);

            string endpoint;
            object payload;

            if (signal.Action == TradeAction.Buy)
            {
                endpoint = $"/v2/accounts/{walletId}/buys";
                payload = new { amount = signal.AmountUsd.ToString("F2"), currency = "USD", payment_method = "wallet" };
            }
            else
            {
                endpoint = $"/v2/accounts/{walletId}/sells";
                payload = new { amount = signal.Quantity.ToString("F8"), currency = signal.Pair.Split('/')[0], payment_method = "wallet" };
            }

            var result = await _api.PostAsync(endpoint, payload);

            if (result?["error"] != null && result["error"].Value<bool>())
            {
                signal.Status = TradeStatus.Failed;
                signal.Notes = result["message"]?.ToString() ?? "API error";
                _log?.LogError("Trade failed: {Notes}", signal.Notes);
            }
            else
            {
                signal.Status = TradeStatus.Executed;
                signal.TxHash = result?["data"]?["transaction"]?["id"]?.ToString();
                signal.Notes = $"Executed on {_config.NetworkId}";
                _log?.LogInformation("Trade executed: {TxHash}", signal.TxHash);
            }
        }
        catch (Exception ex)
        {
            signal.Status = TradeStatus.Failed;
            signal.Notes = $"Exception: {ex.Message}";
            _log?.LogError(ex, "Trade execution failed");
        }

        await _tradeLogger.LogTradeAsync(signal);
        return signal;
    }

    public async Task<TradeRecord> MarketBuyAsync(string pair, decimal amountUsd)
    {
        var signal = new TradeRecord { Action = TradeAction.Buy, Pair = pair, AmountUsd = amountUsd, Strategy = "manual" };
        return await ExecuteAsync(signal);
    }

    public async Task<TradeRecord> MarketSellAsync(string pair, decimal quantity)
    {
        var price = await _api.GetSpotPriceAsync(pair.Replace("/", "-"));
        var signal = new TradeRecord
        {
            Action = TradeAction.Sell, Pair = pair, Quantity = quantity,
            AmountUsd = quantity * (price ?? 0), Strategy = "manual"
        };
        return await ExecuteAsync(signal);
    }
}
