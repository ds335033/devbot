using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Spectre.Console;
using DevBot.Trading.CDP;
using DevBot.Trading.CDP.Keys;
using DevBot.Trading.CDP.Tokens;
using DevBot.Trading.Core.Config;
using DevBot.Trading.Core.Factories;
using DevBot.Trading.Core.Interfaces;
using DevBot.Trading.Core.Services;

namespace DevBot.Trading.Console;

/// <summary>
/// DevBot AI Trading Bot — C# Edition
/// Powered by Coinbase CDP + Claude AI
/// </summary>
class Program
{
    static async Task<int> Main(string[] args)
    {
        // Banner
        AnsiConsole.Write(new FigletText("DevBot").Color(Color.Cyan1));
        AnsiConsole.MarkupLine("[bold cyan]AI Trading Bot v1.0 — C# Edition[/]");
        AnsiConsole.MarkupLine("[dim]Powered by Coinbase CDP + Claude AI[/]\n");

        // Load configuration
        var config = LoadConfiguration();
        var tradingConfig = new TradingConfig();

        // Parse CLI arguments
        var forceTestnet = args.Contains("--testnet");
        var showStatus = args.Contains("--status");
        var dcaLoop = args.Contains("--dca-loop");
        var tradeOnce = args.Contains("--trade-once");
        var strategyArg = GetArgValue(args, "--strategy");

        if (forceTestnet)
        {
            tradingConfig.NetworkId = "base-sepolia";
            AnsiConsole.MarkupLine("[yellow]⚠ Forced TESTNET mode (base-sepolia)[/]");
        }

        // Bind config
        config.GetSection("Trading").Bind(tradingConfig);
        tradingConfig.AnthropicApiKey = config["ANTHROPIC_API_KEY"]
            ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY") ?? "";

        if (!string.IsNullOrEmpty(strategyArg))
            tradingConfig.Strategy = strategyArg;

        // Validate config
        var errors = tradingConfig.Validate();
        if (errors.Any())
        {
            AnsiConsole.MarkupLine("[red]Configuration errors:[/]");
            foreach (var err in errors)
                AnsiConsole.MarkupLine($"  [red]• {err}[/]");
            return 1;
        }

        // Setup DI
        var services = new ServiceCollection();
        services.AddLogging(builder =>
        {
            builder.AddConsole();
            builder.SetMinimumLevel(LogLevel.Information);
        });

        var serviceProvider = services.BuildServiceProvider();
        var loggerFactory = serviceProvider.GetRequiredService<ILoggerFactory>();

        // Load CDP keys
        var keyProvider = new CdpKeyProvider(loggerFactory.CreateLogger<CdpKeyProvider>());
        var key = keyProvider.LoadFromEnvironment();

        if (!key.IsValid)
        {
            // Try loading from file
            var keyFile = config["CDP_KEY_FILE"] ?? "";
            if (!string.IsNullOrEmpty(keyFile) && File.Exists(keyFile))
            {
                key = keyProvider.LoadFromFile(keyFile);
            }
        }

        // Status-only mode (no keys needed)
        if (showStatus)
        {
            ShowStatus(tradingConfig);
            return 0;
        }

        // Validate keys
        if (!key.IsValid)
        {
            AnsiConsole.MarkupLine("\n[red]❌ Missing CDP API keys![/]");
            AnsiConsole.MarkupLine("[dim]Set these environment variables:[/]");
            AnsiConsole.MarkupLine("  [yellow]CDP_API_KEY_NAME[/] = your key name (UUID)");
            AnsiConsole.MarkupLine("  [yellow]CDP_API_KEY_PRIVATE_KEY[/] = your EC private key (PEM)");
            AnsiConsole.MarkupLine("\n[dim]Get keys at:[/] [link]https://portal.cdp.coinbase.com[/]");
            return 1;
        }

        AnsiConsole.MarkupLine($"[green]✅ CDP Key loaded:[/] {key}");
        AnsiConsole.MarkupLine($"[green]✅ Network:[/] {tradingConfig.NetworkId}");
        AnsiConsole.MarkupLine($"[green]✅ Strategy:[/] {tradingConfig.Strategy}");

        if (tradingConfig.IsMainnet)
        {
            AnsiConsole.MarkupLine("\n[bold red on yellow] ⚠ MAINNET MODE — REAL MONEY ⚠ [/]");
            if (!AnsiConsole.Confirm("Are you sure you want to trade with real money?", false))
                return 0;
        }

        // Create trading engine
        var tokenGen = new JwtTokenGenerator(loggerFactory.CreateLogger<JwtTokenGenerator>());
        var apiClient = new CoinbaseApiClient(keyProvider, tokenGen,
            loggerFactory.CreateLogger<CoinbaseApiClient>());
        var tradeLogger = new JsonTradeLogger(tradingConfig, loggerFactory.CreateLogger<JsonTradeLogger>());
        var engine = new TradingEngine(tradingConfig, apiClient, tradeLogger, loggerFactory);

        // Execute mode
        if (tradeOnce)
        {
            var trade = await engine.ExecuteStrategyAsync();
            AnsiConsole.MarkupLine($"\n[bold]📊 Result:[/] {trade}");
            return 0;
        }

        if (dcaLoop)
        {
            using var cts = new CancellationTokenSource();
            System.Console.CancelKeyPress += (_, e) => { e.Cancel = true; cts.Cancel(); };
            await engine.RunDcaLoopAsync(cts.Token);
            return 0;
        }

        // Interactive mode
        await RunInteractiveMode(engine);
        return 0;
    }

    static async Task RunInteractiveMode(TradingEngine engine)
    {
        AnsiConsole.Write(new Rule("[cyan]Interactive Trading Mode[/]").RuleStyle("dim"));
        AnsiConsole.MarkupLine("[dim]Commands: /trade /balance /portfolio /history /switch /status /quit[/]\n");

        while (true)
        {
            var input = AnsiConsole.Ask<string>("[cyan]You >[/]").Trim();

            if (string.IsNullOrEmpty(input)) continue;

            switch (input.ToLowerInvariant())
            {
                case "/quit":
                case "/exit":
                    AnsiConsole.MarkupLine("[yellow]👋 Shutting down trading bot...[/]");
                    return;

                case "/trade":
                    await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .StartAsync($"Executing {engine.ActiveStrategy.Name} strategy...", async _ =>
                        {
                            var trade = await engine.ExecuteStrategyAsync();
                            AnsiConsole.MarkupLine($"\n[bold]📊 {trade}[/]");
                        });
                    break;

                case "/balance":
                    await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .StartAsync("Fetching wallet balance...", async _ =>
                        {
                            var portfolio = await engine.GetPortfolioAsync();
                            var table = new Table()
                                .AddColumn("Token")
                                .AddColumn("Balance")
                                .AddColumn("Price (USD)")
                                .AddColumn("Value (USD)")
                                .AddColumn("Allocation");

                            foreach (var pos in portfolio.Positions)
                            {
                                table.AddRow(
                                    $"[bold]{pos.Symbol}[/]",
                                    pos.Balance.ToString("F6"),
                                    $"${pos.PriceUsd:F2}",
                                    $"[green]${pos.ValueUsd:F2}[/]",
                                    $"{pos.AllocationPercent:F1}%");
                            }

                            table.AddRow("[bold]TOTAL[/]", "", "", $"[bold green]${portfolio.TotalValueUsd:F2}[/]", "100%");
                            AnsiConsole.Write(table);
                        });
                    break;

                case "/portfolio":
                    await AnsiConsole.Status()
                        .Spinner(Spinner.Known.Dots)
                        .StartAsync("Loading portfolio...", async _ =>
                        {
                            var portfolio = await engine.GetPortfolioAsync();
                            var chart = new BreakdownChart();
                            var colors = new[] { Color.Cyan1, Color.Yellow, Color.Green, Color.Orange1, Color.Purple };
                            var i = 0;
                            foreach (var pos in portfolio.Positions)
                            {
                                chart.AddItem(pos.Symbol, (double)pos.AllocationPercent, colors[i % colors.Length]);
                                i++;
                            }
                            AnsiConsole.Write(chart);
                            AnsiConsole.MarkupLine($"\n[bold]Total: ${portfolio.TotalValueUsd:N2}[/]");
                        });
                    break;

                case "/history":
                    await ShowTradeHistory(engine);
                    break;

                case "/status":
                    var status = await engine.GetStatusAsync();
                    AnsiConsole.MarkupLine(status);
                    break;

                case var s when s.StartsWith("/switch"):
                    var parts = s.Split(' ', 2);
                    if (parts.Length > 1)
                    {
                        if (engine.SwitchStrategy(parts[1]))
                            AnsiConsole.MarkupLine($"[green]✅ Switched to {parts[1]}[/]");
                        else
                            AnsiConsole.MarkupLine($"[red]❌ Invalid strategy. Valid: {string.Join(", ", StrategyFactory.GetValidNames())}[/]");
                    }
                    else
                    {
                        AnsiConsole.MarkupLine($"[dim]Usage: /switch <strategy>[/]");
                        AnsiConsole.MarkupLine($"[dim]Available: {string.Join(", ", StrategyFactory.GetValidNames())}[/]");
                    }
                    break;

                default:
                    AnsiConsole.MarkupLine($"[dim]Unknown command. Try: /trade /balance /portfolio /history /switch /status /quit[/]");
                    break;
            }

            AnsiConsole.WriteLine();
        }
    }

    static async Task ShowTradeHistory(TradingEngine engine)
    {
        var status = await engine.GetStatusAsync();
        AnsiConsole.MarkupLine(status);
    }

    static void ShowStatus(TradingConfig config)
    {
        var table = new Table().Title("[bold cyan]DevBot Trading Bot — Status[/]");
        table.AddColumn("Setting");
        table.AddColumn("Value");

        table.AddRow("Network", config.IsTestnet ? $"[green]{config.NetworkId}[/]" : $"[red]{config.NetworkId}[/]");
        table.AddRow("Strategy", $"[cyan]{config.Strategy}[/]");
        table.AddRow("Trade Size", $"[bold]${config.TradeAmountUsd}[/]");
        table.AddRow("Max Daily Trades", config.MaxDailyTrades.ToString());
        table.AddRow("Stop Loss", $"{config.StopLossPercent}%");
        table.AddRow("Take Profit", $"{config.TakeProfitPercent}%");
        table.AddRow("DCA Interval", $"{config.DcaIntervalHours}h");
        table.AddRow("CDP Key", !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("CDP_API_KEY_NAME"))
            ? "[green]✅ Set[/]" : "[red]❌ Missing[/]");
        table.AddRow("Claude Key", !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY"))
            ? "[green]✅ Set[/]" : "[red]❌ Missing[/]");

        AnsiConsole.Write(table);
    }

    static IConfiguration LoadConfiguration()
    {
        return new ConfigurationBuilder()
            .SetBasePath(Directory.GetCurrentDirectory())
            .AddJsonFile("appsettings.json", optional: true)
            .AddEnvironmentVariables()
            .Build();
    }

    static string? GetArgValue(string[] args, string key)
    {
        var index = Array.IndexOf(args, key);
        return index >= 0 && index + 1 < args.Length ? args[index + 1] : null;
    }
}
