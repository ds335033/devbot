using Newtonsoft.Json;
using Microsoft.Extensions.Logging;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.CDP.Keys;

/// <summary>
/// Singleton provider for loading and managing CDP API keys.
/// Inspired by xyLOGIX CDPPrivateKeyProvider singleton pattern.
/// </summary>
public sealed class CdpKeyProvider : ICdpKeyProvider
{
    private static readonly Lazy<CdpKeyProvider> _instance = new(() => new CdpKeyProvider());
    private readonly ILogger<CdpKeyProvider>? _logger;

    private CdpKeyProvider() { }

    public CdpKeyProvider(ILogger<CdpKeyProvider> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Singleton instance access — mirrors xyLOGIX GetCDPPrivateKeyProvider.SoleInstance() pattern.
    /// </summary>
    public static CdpKeyProvider Instance => _instance.Value;

    /// <summary>
    /// The currently loaded CDP API key.
    /// </summary>
    public ICdpApiKey? CurrentKey { get; private set; }

    /// <summary>
    /// Load CDP API key from environment variables.
    /// Reads CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY.
    /// </summary>
    public ICdpApiKey LoadFromEnvironment()
    {
        _logger?.LogInformation("Loading CDP key from environment variables...");

        var name = Environment.GetEnvironmentVariable("CDP_API_KEY_NAME") ?? "";
        var privateKey = Environment.GetEnvironmentVariable("CDP_API_KEY_PRIVATE_KEY") ?? "";

        CurrentKey = MakeNewCdpApiKey.FromScratch()
            .HavingName(name)
            .AndPrivateKeyPem(privateKey);

        if (CurrentKey.IsValid)
            _logger?.LogInformation("CDP key loaded: {KeyName}", name[..Math.Min(8, name.Length)] + "...");
        else
            _logger?.LogWarning("CDP key is invalid or missing. Set CDP_API_KEY_NAME and CDP_API_KEY_PRIVATE_KEY.");

        return CurrentKey;
    }

    /// <summary>
    /// Load CDP API key from a JSON file (Coinbase CDP export format).
    /// Expected format: { "name": "key-id", "privateKey": "-----BEGIN EC PRIVATE KEY-----\n..." }
    /// </summary>
    public ICdpApiKey LoadFromFile(string filePath)
    {
        _logger?.LogInformation("Loading CDP key from file: {Path}", filePath);

        try
        {
            if (!File.Exists(filePath))
            {
                _logger?.LogError("CDP key file not found: {Path}", filePath);
                CurrentKey = MakeNewCdpApiKey.FromScratch();
                return CurrentKey;
            }

            var json = File.ReadAllText(filePath);
            var key = JsonConvert.DeserializeObject<CdpApiKey>(json);

            if (key != null)
            {
                // Normalize PEM newlines (Coinbase exports use \\n)
                key.PrivateKeyPem = key.PrivateKeyPem.Replace("\\n", "\n");
                CurrentKey = key;
                _logger?.LogInformation("CDP key loaded from file: {Key}", CurrentKey);
            }
            else
            {
                _logger?.LogWarning("Failed to deserialize CDP key from file.");
                CurrentKey = MakeNewCdpApiKey.FromScratch();
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Error loading CDP key from file.");
            CurrentKey = MakeNewCdpApiKey.FromScratch();
        }

        return CurrentKey;
    }

    /// <summary>
    /// Save the current key to a JSON file.
    /// </summary>
    public void SaveToFile(string filePath)
    {
        if (CurrentKey == null)
        {
            _logger?.LogWarning("No key loaded to save.");
            return;
        }

        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir) && !Directory.Exists(dir))
            Directory.CreateDirectory(dir);

        var json = JsonConvert.SerializeObject(CurrentKey, Formatting.Indented);
        File.WriteAllText(filePath, json);
        _logger?.LogInformation("CDP key saved to: {Path}", filePath);
    }

    /// <summary>
    /// Set the key from raw values (e.g., from config or user input).
    /// </summary>
    public ICdpApiKey SetKey(string name, string privateKeyPem)
    {
        CurrentKey = MakeNewCdpApiKey.FromScratch()
            .HavingName(name)
            .AndPrivateKeyPem(privateKeyPem);

        _logger?.LogInformation("CDP key set manually: {Key}", CurrentKey);
        return CurrentKey;
    }
}

/// <summary>
/// Factory accessor for the singleton key provider.
/// Pattern: xyLOGIX GetCDPPrivateKeyProvider.SoleInstance()
/// </summary>
public static class GetCdpKeyProvider
{
    public static ICdpKeyProvider SoleInstance() => CdpKeyProvider.Instance;
}
