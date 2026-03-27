namespace DevBot.Trading.CDP.Interfaces;

/// <summary>
/// Contract for generating JWT tokens for Coinbase CDP API authentication.
/// Mirrors xyLOGIX.Coinbase.CDP.Tokens.Interfaces pattern.
/// </summary>
public interface IJwtTokenGenerator
{
    /// <summary>
    /// Generate a signed JWT token for a CDP API request.
    /// </summary>
    /// <param name="key">The CDP API key to sign with.</param>
    /// <param name="method">HTTP method (GET, POST, etc.)</param>
    /// <param name="path">API endpoint path (e.g., /v2/accounts)</param>
    /// <returns>Signed JWT token string.</returns>
    string GenerateFor(ICdpApiKey key, string method, string path);

    /// <summary>
    /// Generate a signed JWT token from raw key components.
    /// </summary>
    string GenerateFor(string keyName, string privateKeyPem, string method, string path);
}
