namespace DevBot.Trading.CDP.Interfaces;

/// <summary>
/// Contract for a Coinbase Developer Platform API key pair.
/// Inspired by xyLOGIX.Coinbase.CDP.Keys.Models.Interfaces pattern.
/// </summary>
public interface ICdpApiKey
{
    /// <summary>
    /// The API key name (UUID format) from Coinbase CDP portal.
    /// </summary>
    string Name { get; set; }

    /// <summary>
    /// The EC private key in PEM format for JWT signing.
    /// </summary>
    string PrivateKeyPem { get; set; }

    /// <summary>
    /// Runtime identifier for this key instance.
    /// </summary>
    Guid KeyId { get; }

    /// <summary>
    /// Whether this key has valid, non-empty values.
    /// </summary>
    bool IsValid { get; }
}
