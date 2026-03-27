using Microsoft.Extensions.Logging;

namespace DevBot.Trading.Core.Actions;

/// <summary>
/// Registry of all available CDP actions.
/// Allows the AI agent to discover and execute actions dynamically.
/// </summary>
public class ActionRegistry
{
    private readonly Dictionary<string, ICdpAction> _actions = new();
    private readonly ILogger<ActionRegistry>? _logger;

    public IReadOnlyDictionary<string, ICdpAction> Actions => _actions;

    public ActionRegistry(ILogger<ActionRegistry>? logger = null) => _logger = logger;

    public void Register(ICdpAction action)
    {
        _actions[action.Name] = action;
        _logger?.LogDebug("Registered action: {Name}", action.Name);
    }

    public async Task<ActionResult> ExecuteAsync(string actionName, ActionContext context)
    {
        if (!_actions.TryGetValue(actionName, out var action))
            return ActionResult.Fail($"Unknown action: {actionName}. Available: {string.Join(", ", _actions.Keys)}");

        _logger?.LogInformation("Executing action: {Name}", actionName);
        var result = await action.ExecuteAsync(context);
        _logger?.LogInformation("Action {Name}: {Success} — {Message}", actionName, result.Success, result.Message);
        return result;
    }

    public string GetActionManifest()
    {
        var lines = _actions.Values.Select(a => $"  - {a.Name}: {a.Description}");
        return $"Available actions:\n{string.Join("\n", lines)}";
    }
}
