using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.Core.Actions;

public class TransferAction : ICdpAction
{
    public string Name => "transfer";
    public string Description => "Transfer tokens from the active wallet to a destination address. Requires: to_address, amount, currency.";

    private readonly IWalletService _walletService;

    public TransferAction(IWalletService walletService) => _walletService = walletService;

    public async Task<ActionResult> ExecuteAsync(ActionContext context)
    {
        try
        {
            if (!context.Parameters.TryGetValue("to_address", out var toAddress) || string.IsNullOrEmpty(toAddress))
                return ActionResult.Fail("Missing required parameter: to_address");

            if (!context.Parameters.TryGetValue("amount", out var amountStr) || !decimal.TryParse(amountStr, out var amount))
                return ActionResult.Fail("Missing or invalid parameter: amount");

            context.Parameters.TryGetValue("currency", out var currency);
            currency ??= "ETH";

            var result = await _walletService.TransferAsync(context.WalletId, toAddress, amount, currency);

            return new ActionResult
            {
                Success = result.Status != "failed",
                Message = $"Transfer {result.Status}: {amount} {currency} to {toAddress[..10]}... (tx: {result.TxHash ?? "pending"})",
                TxHash = result.TxHash,
                Data = result
            };
        }
        catch (Exception ex)
        {
            return ActionResult.Fail($"Transfer failed: {ex.Message}");
        }
    }
}
