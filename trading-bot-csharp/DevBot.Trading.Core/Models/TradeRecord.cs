using Newtonsoft.Json;

namespace DevBot.Trading.Core.Models;

/// <summary>
/// Record of an executed trade.
/// </summary>
public class TradeRecord
{
    [JsonProperty("id")]
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..12];

    [JsonProperty("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonProperty("strategy")]
    public string Strategy { get; set; } = "";

    [JsonProperty("action")]
    public TradeAction Action { get; set; }

    [JsonProperty("pair")]
    public string Pair { get; set; } = "ETH/USDC";

    [JsonProperty("amount_usd")]
    public decimal AmountUsd { get; set; }

    [JsonProperty("price")]
    public decimal Price { get; set; }

    [JsonProperty("quantity")]
    public decimal Quantity { get; set; }

    [JsonProperty("network")]
    public string Network { get; set; } = "";

    [JsonProperty("status")]
    public TradeStatus Status { get; set; } = TradeStatus.Pending;

    [JsonProperty("tx_hash")]
    public string? TxHash { get; set; }

    [JsonProperty("notes")]
    public string Notes { get; set; } = "";

    public override string ToString() =>
        $"[{Timestamp:yyyy-MM-dd HH:mm}] {Action} {Pair} ${AmountUsd:F2} @ ${Price:F2} ({Strategy})";
}

public enum TradeAction
{
    Buy,
    Sell,
    Hold
}

public enum TradeStatus
{
    Pending,
    Executed,
    Failed,
    Cancelled
}
