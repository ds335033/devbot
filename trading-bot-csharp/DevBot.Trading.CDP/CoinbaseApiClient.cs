using System.Net.Http.Headers;
using System.Text;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using DevBot.Trading.CDP.Interfaces;

namespace DevBot.Trading.CDP;

/// <summary>
/// HTTP client for Coinbase CDP REST API.
/// Uses JWT authentication generated from CDP keys.
/// </summary>
public class CoinbaseApiClient : IDisposable
{
    private readonly HttpClient _http;
    private readonly ICdpKeyProvider _keyProvider;
    private readonly IJwtTokenGenerator _tokenGenerator;
    private readonly ILogger<CoinbaseApiClient>? _logger;
    private readonly string _baseUrl;

    public CoinbaseApiClient(
        ICdpKeyProvider keyProvider,
        IJwtTokenGenerator tokenGenerator,
        ILogger<CoinbaseApiClient>? logger = null,
        string baseUrl = "https://api.coinbase.com")
    {
        _keyProvider = keyProvider;
        _tokenGenerator = tokenGenerator;
        _logger = logger;
        _baseUrl = baseUrl.TrimEnd('/');
        _http = new HttpClient { BaseAddress = new Uri(_baseUrl) };
    }

    /// <summary>
    /// Make an authenticated GET request to the Coinbase API.
    /// </summary>
    public async Task<JObject?> GetAsync(string path)
    {
        return await SendAsync(HttpMethod.Get, path);
    }

    /// <summary>
    /// Make an authenticated POST request to the Coinbase API.
    /// </summary>
    public async Task<JObject?> PostAsync(string path, object? body = null)
    {
        return await SendAsync(HttpMethod.Post, path, body);
    }

    /// <summary>
    /// Get all accounts (wallets) on the CDP.
    /// </summary>
    public async Task<JObject?> GetAccountsAsync()
    {
        return await GetAsync("/v2/accounts");
    }

    /// <summary>
    /// Get current price for a trading pair (e.g., "ETH-USD").
    /// </summary>
    public async Task<decimal?> GetSpotPriceAsync(string pair)
    {
        var result = await GetAsync($"/v2/prices/{pair}/spot");
        var amount = result?["data"]?["amount"]?.ToString();
        return amount != null ? decimal.Parse(amount) : null;
    }

    /// <summary>
    /// Get exchange rates for a base currency.
    /// </summary>
    public async Task<JObject?> GetExchangeRatesAsync(string currency = "USD")
    {
        return await GetAsync($"/v2/exchange-rates?currency={currency}");
    }

    /// <summary>
    /// Get account balance for a specific account ID.
    /// </summary>
    public async Task<JObject?> GetAccountBalanceAsync(string accountId)
    {
        return await GetAsync($"/v2/accounts/{accountId}");
    }

    /// <summary>
    /// Send an authenticated request with JWT token.
    /// </summary>
    private async Task<JObject?> SendAsync(HttpMethod method, string path, object? body = null)
    {
        var key = _keyProvider.CurrentKey
            ?? throw new InvalidOperationException("No CDP key loaded.");

        var jwt = _tokenGenerator.GenerateFor(key, method.Method, path);

        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", jwt);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (body != null)
        {
            var json = JsonConvert.SerializeObject(body);
            request.Content = new StringContent(json, Encoding.UTF8, "application/json");
        }

        _logger?.LogDebug("{Method} {Path}", method.Method, path);

        try
        {
            var response = await _http.SendAsync(request);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger?.LogError("API error {StatusCode}: {Content}", response.StatusCode, content[..Math.Min(500, content.Length)]);
                return JObject.Parse($"{{\"error\": true, \"status\": {(int)response.StatusCode}, \"message\": \"{response.ReasonPhrase}\"}}");
            }

            return JObject.Parse(content);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "Request failed: {Method} {Path}", method.Method, path);
            throw;
        }
    }

    public void Dispose()
    {
        _http.Dispose();
        GC.SuppressFinalize(this);
    }
}
