using Microsoft.Extensions.Logging;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Strategies;

namespace DevBot.Trading.Core.Factories;

/// <summary>
/// Factory for creating trading strategy instances by name.
/// </summary>
public static class StrategyFactory
{
    private static readonly string[] ValidStrategies =
        { "momentum", "dca", "mean_reversion", "grid", "rebalance", "ai" };

    /// <summary>
    /// Create a strategy instance by name.
    /// </summary>
    public static ITradingStrategy Create(string strategyName, TradingConfig config, ILoggerFactory? loggerFactory = null)
    {
        return strategyName.ToLowerInvariant() switch
        {
            "momentum" => new MomentumStrategy(config, loggerFactory?.CreateLogger<MomentumStrategy>()),
            "dca" => new DcaStrategy(config, loggerFactory?.CreateLogger<DcaStrategy>()),
            "mean_reversion" => new MeanReversionStrategy(config, loggerFactory?.CreateLogger<MeanReversionStrategy>()),
            "grid" => new GridStrategy(config, loggerFactory?.CreateLogger<GridStrategy>()),
            "rebalance" => new RebalanceStrategy(config, loggerFactory?.CreateLogger<RebalanceStrategy>()),
            "ai" => new AiStrategy(config, loggerFactory?.CreateLogger<AiStrategy>()),
            _ => throw new ArgumentException(
                $"Unknown strategy: '{strategyName}'. Valid: {string.Join(", ", ValidStrategies)}",
                nameof(strategyName))
        };
    }

    /// <summary>
    /// Create all available strategies.
    /// </summary>
    public static Dictionary<string, ITradingStrategy> CreateAll(TradingConfig config, ILoggerFactory? loggerFactory = null)
    {
        return ValidStrategies.ToDictionary(
            name => name,
            name => Create(name, config, loggerFactory));
    }

    /// <summary>
    /// Get all valid strategy names.
    /// </summary>
    public static IReadOnlyList<string> GetValidNames() => ValidStrategies;
}
