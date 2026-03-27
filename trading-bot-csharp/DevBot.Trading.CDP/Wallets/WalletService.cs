using Microsoft.Extensions.Logging;
using Newtonsoft.Json.Linq;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.CDP.Wallets;

/// <summary>
/// CDP Wallet management — create, list, transfer, and balance operations.
/// Uses Coinbase CDP Server-Signer wallets on Base network.
/// </summary>
public class WalletService : IWalletService
{
    private readonly CoinbaseApiClient _api;
    private readonly ILogger<WalletService>? _logger;
    private string? _activeWalletId;
    private string? _activeAddress;

    public string? ActiveWalletId => _activeWalletId;
    public string? ActiveAddress => _activeAddress;

    public WalletService(CoinbaseApiClient api, ILogger<WalletService>? logger = null)
    {
        _api = api;
        _logger = logger;
    }

    public async Task<WalletInfo> CreateWalletAsync(string networkId = "base-sepolia")
    {
        _logger?.LogInformation("Creating wallet on {Network}...", networkId);

        var result = await _api.PostAsync("/v2/accounts", new
        {
            name = $"DevBot-{networkId}-{DateTime.UtcNow:yyyyMMdd-HHmmss}"
        });

        var data = result?["data"];
        var wallet = new WalletInfo
        {
            Id = data?["id"]?.ToString() ?? "",
            Name = data?["name"]?.ToString() ?? "",
            Currency = data?["currency"]?["code"]?.ToString() ?? "ETH",
            Network = networkId,
            CreatedAt = DateTime.UtcNow
        };

        _activeWalletId = wallet.Id;
        _logger?.LogInformation("Wallet created: {Id} on {Network}", wallet.Id, networkId);
        return wallet;
    }

    public async Task<List<WalletInfo>> ListWalletsAsync()
    {
        var result = await _api.GetAccountsAsync();
        var wallets = new List<WalletInfo>();

        var data = result?["data"];
        if (data != null)
        {
            foreach (var item in data)
            {
                var balance = item["balance"];
                wallets.Add(new WalletInfo
                {
                    Id = item["id"]?.ToString() ?? "",
                    Name = item["name"]?.ToString() ?? "",
                    Currency = balance?["currency"]?.ToString() ?? "",
                    Balance = decimal.TryParse(balance?["amount"]?.ToString(), out var amt) ? amt : 0,
                    Network = item["network"]?.ToString() ?? ""
                });
            }
        }

        _logger?.LogInformation("Found {Count} wallets", wallets.Count);
        return wallets;
    }

    public async Task<WalletBalance> GetBalanceAsync(string walletId)
    {
        var result = await _api.GetAccountBalanceAsync(walletId);
        var data = result?["data"];
        var balance = data?["balance"];

        return new WalletBalance
        {
            WalletId = walletId,
            Currency = balance?["currency"]?.ToString() ?? "",
            Amount = decimal.TryParse(balance?["amount"]?.ToString(), out var amt) ? amt : 0,
            NativeCurrency = data?["native_balance"]?["currency"]?.ToString() ?? "USD",
            NativeAmount = decimal.TryParse(data?["native_balance"]?["amount"]?.ToString(), out var native) ? native : 0
        };
    }

    public async Task<TransferResult> TransferAsync(string fromWalletId, string toAddress, decimal amount, string currency = "ETH")
    {
        _logger?.LogInformation("Transfer: {Amount} {Currency} from {Wallet} to {Address}",
            amount, currency, fromWalletId, toAddress);

        var result = await _api.PostAsync($"/v2/accounts/{fromWalletId}/transactions", new
        {
            type = "send",
            to = toAddress,
            amount = amount.ToString("F8"),
            currency = currency
        });

        var data = result?["data"];
        var transfer = new TransferResult
        {
            Id = data?["id"]?.ToString() ?? "",
            Status = data?["status"]?.ToString() ?? "pending",
            TxHash = data?["network"]?["hash"]?.ToString(),
            Amount = amount,
            Currency = currency,
            ToAddress = toAddress,
            Timestamp = DateTime.UtcNow
        };

        _logger?.LogInformation("Transfer {Status}: {Id} tx={TxHash}", transfer.Status, transfer.Id, transfer.TxHash);
        return transfer;
    }

    public void SetActiveWallet(string walletId, string? address = null)
    {
        _activeWalletId = walletId;
        _activeAddress = address;
        _logger?.LogInformation("Active wallet set: {WalletId}", walletId);
    }

    public async Task<bool> RequestFaucetAsync(string walletId)
    {
        _logger?.LogInformation("Requesting testnet faucet for {Wallet}...", walletId);
        try
        {
            var result = await _api.PostAsync($"/v2/accounts/{walletId}/transactions", new
            {
                type = "request",
                amount = "0.01",
                currency = "ETH"
            });
            return result?["error"] == null;
        }
        catch (Exception ex)
        {
            _logger?.LogWarning(ex, "Faucet request failed");
            return false;
        }
    }
}

public class WalletInfo
{
    public string Id { get; set; } = "";
    public string Name { get; set; } = "";
    public string Currency { get; set; } = "";
    public string Network { get; set; } = "";
    public decimal Balance { get; set; }
    public string Address { get; set; } = "";
    public DateTime CreatedAt { get; set; }
    public override string ToString() => $"{Name} ({Currency}: {Balance:F6}) [{(Id.Length > 8 ? Id[..8] : Id)}...]";
}

public class WalletBalance
{
    public string WalletId { get; set; } = "";
    public string Currency { get; set; } = "";
    public decimal Amount { get; set; }
    public string NativeCurrency { get; set; } = "USD";
    public decimal NativeAmount { get; set; }
}

public class TransferResult
{
    public string Id { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string? TxHash { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "";
    public string ToAddress { get; set; } = "";
    public DateTime Timestamp { get; set; }
}
