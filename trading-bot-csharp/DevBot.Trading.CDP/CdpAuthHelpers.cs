using DevBot.Trading.CDP.Interfaces;
using DevBot.Trading.CDP.Keys;
using DevBot.Trading.CDP.Tokens;

namespace DevBot.Trading.CDP;

/// <summary>
/// Top-level public API for CDP authentication.
/// Mirrors xyLOGIX CoinbaseCDPKeyAuthHelpers — orchestrates key loading + JWT generation.
/// </summary>
public static class CdpAuthHelpers
{
    /// <summary>
    /// Generate a JWT token using the currently loaded key.
    /// </summary>
    /// <param name="method">HTTP method (GET, POST, etc.)</param>
    /// <param name="path">API endpoint path (e.g., /v2/accounts)</param>
    /// <returns>Signed JWT token string.</returns>
    public static string GetJWT(string method, string path)
    {
        var key = GetCdpKeyProvider.SoleInstance().CurrentKey
            ?? throw new InvalidOperationException("No CDP key loaded. Call CdpKeyProvider.LoadFromEnvironment() first.");

        return GetJWT(key, method, path);
    }

    /// <summary>
    /// Generate a JWT token using a specific key.
    /// </summary>
    public static string GetJWT(ICdpApiKey key, string method, string path)
    {
        return GetJwtTokenGenerator.SoleInstance().GenerateFor(key, method, path);
    }
}
