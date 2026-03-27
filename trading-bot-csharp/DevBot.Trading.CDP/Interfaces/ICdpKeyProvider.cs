namespace DevBot.Trading.CDP.Interfaces;

/// <summary>
/// Contract for loading and managing CDP API keys.
/// Inspired by xyLOGIX.Coinbase.CDP.Keys.Providers.Interfaces pattern.
/// </summary>
public interface ICdpKeyProvider
{
    /// <summary>
    /// The currently loaded CDP API key.
    /// </summary>
    ICdpApiKey? CurrentKey { get; }

    /// <summary>
    /// Load a CDP API key from environment variables.
    /// </summary>
    ICdpApiKey LoadFromEnvironment();

    /// <summary>
    /// Load a CDP API key from a JSON file.
    /// </summary>
    /// <param name="filePath">Path to the JSON key file.</param>
    ICdpApiKey LoadFromFile(string filePath);

    /// <summary>
    /// Save the current key to a JSON file.
    /// </summary>
    /// <param name="filePath">Destination file path.</param>
    void SaveToFile(string filePath);

    /// <summary>
    /// Set the key from raw values.
    /// </summary>
    ICdpApiKey SetKey(string name, string privateKeyPem);
}
