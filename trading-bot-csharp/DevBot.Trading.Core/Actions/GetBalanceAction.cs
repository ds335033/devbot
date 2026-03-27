using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.Core.Actions;

public class GetBalanceAction : ICdpAction
{
    public string Name => "get_balance";
    public string Description => "Get the current balance of all tokens in the wallet.";

    private readonly IWalletService _walletService;

    public GetBalanceAction(IWalletService walletService) => _walletService = walletService;

    public async Task<ActionResult> ExecuteAsync(ActionContext context)
    {
        try
        {
            if (string.IsNullOrEmpty(context.WalletId))
                return ActionResult.Fail("No wallet ID provided");

            var balance = await _walletService.GetBalanceAsync(context.WalletId);
            return ActionResult.Ok(
                $"Wallet {context.WalletId[..8]}... balance: {balance.Amount} {balance.Currency} (${balance.NativeAmount:F2} {balance.NativeCurrency})",
                balance);
        }
        catch (Exception ex)
        {
            return ActionResult.Fail($"Failed to get balance: {ex.Message}");
        }
    }
}
