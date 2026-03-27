using DevBot.Trading.CDP;

namespace DevBot.Trading.Core.Actions;

public class SwapTokensAction : ICdpAction
{
    public string Name => "swap_tokens";
    public string Description => "Swap one token for another. Requires: from_token, to_token, amount_usd.";

    private readonly CoinbaseApiClient _api;

    public SwapTokensAction(CoinbaseApiClient api) => _api = api;

    public async Task<ActionResult> ExecuteAsync(ActionContext context)
    {
        try
        {
            context.Parameters.TryGetValue("from_token", out var fromToken);
            context.Parameters.TryGetValue("to_token", out var toToken);
            context.Parameters.TryGetValue("amount_usd", out var amountStr);

            fromToken ??= "USDC";
            toToken ??= "ETH";

            if (!decimal.TryParse(amountStr, out var amount))
                amount = context.TradeAmountUsd;

            var price = await _api.GetSpotPriceAsync($"{toToken}-USD");
            if (price == null || price <= 0)
                return ActionResult.Fail($"Could not get price for {toToken}");

            var quantity = amount / price.Value;

            var result = await _api.PostAsync($"/v2/accounts/{context.WalletId}/buys", new
            {
                amount = amount.ToString("F2"),
                currency = "USD",
                payment_method = "wallet"
            });

            if (result?["error"] != null)
                return ActionResult.Fail($"Swap failed: {result["message"]}");

            var txId = result?["data"]?["id"]?.ToString();
            return ActionResult.Ok(
                $"Swapped ${amount:F2} {fromToken} -> {quantity:F6} {toToken} @ ${price.Value:F2}",
                new { from = fromToken, to = toToken, amount, quantity, price = price.Value, txId });
        }
        catch (Exception ex)
        {
            return ActionResult.Fail($"Swap failed: {ex.Message}");
        }
    }
}
