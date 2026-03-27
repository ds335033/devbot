namespace DevBot.Trading.Core.Config;

/// <summary>
/// Trading bot configuration — maps to appsettings.json and environment variables.
/// Mirrors Python bot.py configuration but in strongly-typed C#.
/// </summary>
public class TradingConfig
{
    public string NetworkId { get; set; } = "base-sepolia";
    public string Strategy { get; set; } = "momentum";
    public decimal TradeAmountUsd { get; set; } = 25m;
    public int MaxDailyTrades { get; set; } = 10;
    public decimal StopLossPercent { get; set; } = 5m;
    public decimal TakeProfitPercent { get; set; } = 10m;
    public double DcaIntervalHours { get; set; } = 4.0;
    public string AnthropicApiKey { get; set; } = "";
    public string DataDirectory { get; set; } = "data";

    /// <summary>
    /// Whether we're on testnet (safe mode).
    /// </summary>
    public bool IsTestnet => NetworkId.Contains("sepolia", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Whether we're on mainnet (REAL MONEY!).
    /// </summary>
    public bool IsMainnet => NetworkId.Contains("mainnet", StringComparison.OrdinalIgnoreCase);

    /// <summary>
    /// Validate the configuration has all required values.
    /// </summary>
    public List<string> Validate()
    {
        var errors = new List<string>();
        if (TradeAmountUsd <= 0) errors.Add("TradeAmountUsd must be > 0");
        if (MaxDailyTrades <= 0) errors.Add("MaxDailyTrades must be > 0");
        if (StopLossPercent <= 0 || StopLossPercent >= 100) errors.Add("StopLossPercent must be 0-100");
        if (TakeProfitPercent <= 0 || TakeProfitPercent >= 100) errors.Add("TakeProfitPercent must be 0-100");
        if (DcaIntervalHours <= 0) errors.Add("DcaIntervalHours must be > 0");
        return errors;
    }
}
