using Newtonsoft.Json;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.CDP.Keys;

/// <summary>
/// Represents a Coinbase Developer Platform API key pair.
/// Modeled after xyLOGIX CoinbaseJwtPrivateKey with fluent builder support.
/// </summary>
public class CdpApiKey : ICdpApiKey
{
    /// <summary>
    /// The API key name (UUID) from Coinbase CDP portal.
    /// Maps to "name" in CDP JSON key file.
    /// </summary>
    [JsonProperty("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// The EC private key in PEM format.
    /// Maps to "privateKey" in CDP JSON key file.
    /// </summary>
    [JsonProperty("privateKey")]
    public string PrivateKeyPem { get; set; } = string.Empty;

    /// <summary>
    /// Runtime unique identifier for this key instance.
    /// </summary>
    [JsonIgnore]
    public Guid KeyId { get; } = Guid.NewGuid();

    /// <summary>
    /// Whether this key has valid, non-empty values.
    /// </summary>
    [JsonIgnore]
    public bool IsValid =>
        !string.IsNullOrWhiteSpace(Name) &&
        !string.IsNullOrWhiteSpace(PrivateKeyPem) &&
        PrivateKeyPem.Contains("BEGIN");

    public override string ToString() =>
        IsValid ? $"CDP Key [{Name[..8]}...] (Valid)" : "CDP Key (Invalid/Empty)";
}

/// <summary>
/// Fluent builder for creating CdpApiKey instances.
/// Pattern inspired by xyLOGIX MakeNewCoinbaseJwtPrivateKey factory.
/// </summary>
public static class MakeNewCdpApiKey
{
    /// <summary>
    /// Create a new empty CDP API key.
    /// </summary>
    public static ICdpApiKey FromScratch() => new CdpApiKey();

    /// <summary>
    /// Set the key name (fluent builder).
    /// </summary>
    public static ICdpApiKey HavingName(this ICdpApiKey self, string name)
    {
        ArgumentNullException.ThrowIfNull(self);
        self.Name = name;
        return self;
    }

    /// <summary>
    /// Set the private key PEM (fluent builder).
    /// </summary>
    public static ICdpApiKey AndPrivateKeyPem(this ICdpApiKey self, string pem)
    {
        ArgumentNullException.ThrowIfNull(self);
        self.PrivateKeyPem = pem.Replace("\\n", "\n");
        return self;
    }
}
