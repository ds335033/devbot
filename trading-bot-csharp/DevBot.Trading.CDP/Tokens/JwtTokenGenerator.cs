using System.Security.Cryptography;
using Microsoft.Extensions.Logging;
using Org.BouncyCastle.Crypto;
using Org.BouncyCastle.Crypto.Parameters;
using Org.BouncyCastle.OpenSsl;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.CDP.Tokens;

/// <summary>
/// Generates JWT tokens for Coinbase CDP API authentication.
/// Directly inspired by xyLOGIX JwtTokenGenerator — uses ES256 signing
/// with EC private keys parsed via BouncyCastle.
/// </summary>
public sealed class JwtTokenGenerator : IJwtTokenGenerator
{
    private static readonly Lazy<JwtTokenGenerator> _instance = new(() => new JwtTokenGenerator());
    private static readonly RandomNumberGenerator _rng = RandomNumberGenerator.Create();
    private readonly ILogger<JwtTokenGenerator>? _logger;

    private static readonly HashSet<string> ValidMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "GET", "POST", "PUT", "DELETE", "PATCH"
    };

    private JwtTokenGenerator() { }

    public JwtTokenGenerator(ILogger<JwtTokenGenerator> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Singleton access — mirrors xyLOGIX pattern.
    /// </summary>
    public static JwtTokenGenerator Instance => _instance.Value;

    /// <summary>
    /// Generate a signed JWT for a CDP API request using a key object.
    /// </summary>
    public string GenerateFor(ICdpApiKey key, string method, string path)
    {
        ArgumentNullException.ThrowIfNull(key);
        if (!key.IsValid)
            throw new InvalidOperationException("CDP API key is not valid. Ensure Name and PrivateKeyPem are set.");

        return GenerateFor(key.Name, key.PrivateKeyPem, method, path);
    }

    /// <summary>
    /// Generate a signed JWT from raw key components.
    /// Replicates the xyLOGIX JWT generation logic:
    /// - ES256 signing with EC private key
    /// - 15-second expiry
    /// - Coinbase-specific claims (iss, aud, uri)
    /// - Cryptographic nonce
    /// </summary>
    public string GenerateFor(string keyName, string privateKeyPem, string method, string path)
    {
        if (string.IsNullOrWhiteSpace(keyName))
            throw new ArgumentException("Key name is required.", nameof(keyName));
        if (string.IsNullOrWhiteSpace(privateKeyPem))
            throw new ArgumentException("Private key PEM is required.", nameof(privateKeyPem));

        method = method.ToUpperInvariant();
        if (!ValidMethods.Contains(method))
            throw new ArgumentException($"Invalid HTTP method: {method}", nameof(method));

        _logger?.LogDebug("Generating JWT for {Method} {Path}", method, path);

        // Normalize PEM newlines
        var pem = privateKeyPem.Replace("\\n", "\n");

        // Parse EC private key using BouncyCastle (same approach as xyLOGIX)
        using var reader = new StringReader(pem);
        var pemReader = new PemReader(reader);
        var keyObject = pemReader.ReadObject();

        ECParameters ecParams;
        if (keyObject is AsymmetricCipherKeyPair keyPair)
        {
            ecParams = ConvertToECParameters((ECPrivateKeyParameters)keyPair.Private);
        }
        else if (keyObject is ECPrivateKeyParameters privateKey)
        {
            ecParams = ConvertToECParameters(privateKey);
        }
        else
        {
            throw new InvalidOperationException($"Unexpected key type: {keyObject?.GetType().Name ?? "null"}");
        }

        // Create ECDsa from parameters
        using var ecdsa = ECDsa.Create(ecParams);

        // Build JWT payload — mirrors xyLOGIX payload structure exactly
        var now = DateTimeOffset.UtcNow;
        var nonce = GenerateNonce(10);
        var uri = $"{method} api.coinbase.com{path}";

        var header = new Dictionary<string, object>
        {
            { "alg", "ES256" },
            { "kid", keyName },
            { "nonce", nonce },
            { "typ", "JWT" }
        };

        var payload = new Dictionary<string, object>
        {
            { "sub", keyName },
            { "iss", "coinbase-cloud" },
            { "nbf", now.ToUnixTimeSeconds() },
            { "exp", now.AddSeconds(15).ToUnixTimeSeconds() },
            { "aud", new[] { "retail_rest_api_proxy" } },
            { "uri", uri }
        };

        // Sign with ES256
        var token = Jose.JWT.Encode(payload, ecdsa, Jose.JwsAlgorithm.ES256, extraHeaders: header);

        _logger?.LogDebug("JWT generated successfully for {Uri}", uri);
        return token;
    }

    /// <summary>
    /// Convert BouncyCastle EC parameters to .NET ECParameters.
    /// Same conversion logic as xyLOGIX JwtTokenGenerator.
    /// </summary>
    private static ECParameters ConvertToECParameters(ECPrivateKeyParameters privateKey)
    {
        var q = privateKey.Parameters.G.Multiply(privateKey.D).Normalize();
        var d = privateKey.D.ToByteArrayUnsigned();
        var x = q.AffineXCoord.GetEncoded();
        var y = q.AffineYCoord.GetEncoded();

        // Ensure 32-byte arrays for P-256
        d = PadTo32Bytes(d);
        x = PadTo32Bytes(x);
        y = PadTo32Bytes(y);

        return new ECParameters
        {
            Curve = ECCurve.NamedCurves.nistP256,
            D = d,
            Q = new ECPoint { X = x, Y = y }
        };
    }

    private static byte[] PadTo32Bytes(byte[] input)
    {
        if (input.Length >= 32) return input[^32..];
        var padded = new byte[32];
        Buffer.BlockCopy(input, 0, padded, 32 - input.Length, input.Length);
        return padded;
    }

    /// <summary>
    /// Generate a cryptographically secure hex nonce.
    /// Replicates xyLOGIX GenerateNonce() exactly.
    /// </summary>
    private static string GenerateNonce(int digits)
    {
        var buffer = new byte[digits / 2];
        _rng.GetBytes(buffer);

        var result = string.Empty;
        for (var i = 0; i < buffer.Length; i++)
            result += buffer[i].ToString("X2");

        if (digits % 2 == 1)
        {
            var extraBuffer = new byte[1];
            _rng.GetBytes(extraBuffer);
            result += extraBuffer[0].ToString("X");
        }

        return result;
    }
}

/// <summary>
/// Factory accessor for the singleton JWT generator.
/// Pattern: xyLOGIX GetJwtTokenGenerator.SoleInstance()
/// </summary>
public static class GetJwtTokenGenerator
{
    public static IJwtTokenGenerator SoleInstance() => JwtTokenGenerator.Instance;
}
