namespace DevBot.Trading.Core.Actions;

/// <summary>
/// AgentKit-style action pattern.
/// Each action is a composable unit that can be executed by the trading engine or AI agent.
/// </summary>
public interface ICdpAction
{
    string Name { get; }
    string Description { get; }
    Task<ActionResult> ExecuteAsync(ActionContext context);
}

public class ActionContext
{
    public string WalletId { get; set; } = "";
    public string NetworkId { get; set; } = "";
    public decimal TradeAmountUsd { get; set; }
    public Dictionary<string, string> Parameters { get; set; } = new();
}

public class ActionResult
{
    public bool Success { get; set; }
    public string Message { get; set; } = "";
    public object? Data { get; set; }
    public string? TxHash { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    public static ActionResult Ok(string message, object? data = null) =>
        new() { Success = true, Message = message, Data = data };
    public static ActionResult Fail(string message) =>
        new() { Success = false, Message = message };
}
