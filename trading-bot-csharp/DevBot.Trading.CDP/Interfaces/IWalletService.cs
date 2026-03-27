using DevBot.Trading.CDP.Wallets;

namespace DevBot.Trading.CDP.Interfaces;

/// <summary>
/// Contract for CDP wallet operations.
/// </summary>
public interface IWalletService
{
    string? ActiveWalletId { get; }
    string? ActiveAddress { get; }
    Task<WalletInfo> CreateWalletAsync(string networkId = "base-sepolia");
    Task<List<WalletInfo>> ListWalletsAsync();
    Task<WalletBalance> GetBalanceAsync(string walletId);
    Task<TransferResult> TransferAsync(string fromWalletId, string toAddress, decimal amount, string currency = "ETH");
    void SetActiveWallet(string walletId, string? address = null);
    Task<bool> RequestFaucetAsync(string walletId);
}
