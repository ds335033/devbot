using Newtonsoft.Json;

namespace DevBot.Trading.Core.Models;

/// <summary>
/// A single portfolio position (token holding).
/// </summary>
public class PortfolioPosition
{
    [JsonProperty("symbol")]
    public string Symbol { get; set; } = "";

    [JsonProperty("balance")]
    public decimal Balance { get; set; }

    [JsonProperty("price_usd")]
    public decimal PriceUsd { get; set; }

    [JsonProperty("value_usd")]
    public decimal ValueUsd => Balance * PriceUsd;

    [JsonProperty("allocation_pct")]
    public decimal AllocationPercent { get; set; }

    [JsonProperty("cost_basis")]
    public decimal CostBasis { get; set; }

    /// <summary>
    /// Unrealised P&L percentage.
    /// </summary>
    public decimal PnlPercent => CostBasis > 0
        ? ((ValueUsd - CostBasis) / CostBasis) * 100
        : 0;

    public override string ToString() =>
        $"{Symbol}: {Balance:F6} (${ValueUsd:F2} | {AllocationPercent:F1}%)";
}

/// <summary>
/// Complete portfolio snapshot.
/// </summary>
public class Portfolio
{
    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonProperty("positions")]
    public List<PortfolioPosition> Positions { get; set; } = new();

    [JsonProperty("total_value_usd")]
    public decimal TotalValueUsd => Positions.Sum(p => p.ValueUsd);

    [JsonProperty("network")]
    public string Network { get; set; } = "";

    [JsonProperty("wallet_address")]
    public string WalletAddress { get; set; } = "";

    /// <summary>
    /// Update allocation percentages based on current values.
    /// </summary>
    public void RecalculateAllocations()
    {
        var total = TotalValueUsd;
        foreach (var pos in Positions)
        {
            pos.AllocationPercent = total > 0 ? (pos.ValueUsd / total) * 100 : 0;
        }
    }
}
