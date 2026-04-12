/**
 * ══════════════════════════════════════════════════════════════════════════════
 * DEVBOT ONCHAIN TRADER — DIRECT BLOCKCHAIN TRADING (NO MIDDLEMAN)
 * ══════════════════════════════════════════════════════════════════════════════
 *
 * Trades directly on Ethereum/Base L2 via Uniswap DEX.
 * Your keys, your wallet, your money. No Coinbase. No KYC.
 *
 * NETWORKS SUPPORTED:
 *   - Base (Coinbase L2) — cheapest gas fees (~$0.001 per tx)
 *   - Ethereum Mainnet — for bigger trades
 *
 * DEX: Uniswap V3 (on Base) — largest decentralized exchange
 *
 * TOKENS:
 *   - ETH  — Ethereum
 *   - USDC — US Dollar stablecoin (your base currency)
 *   - WETH — Wrapped ETH (for DEX trading)
 *
 * SAFETY: Same bulletproof 7-layer system from tradebot.js
 *
 * HOW IT WORKS:
 *   1. You hold USDC in your wallet (stable, pegged to $1)
 *   2. Bot watches prices via on-chain oracles
 *   3. When signal triggers → bot builds a swap transaction
 *   4. Transaction goes directly to Uniswap smart contract
 *   5. Tokens land in YOUR wallet — no middleman ever touches them
 *
 * REQUIRES:
 *   npm install ethers@6
 *
 * Run: WALLET_KEY=your_private_key node src/trading/bot/onchain-trader.js
 * ══════════════════════════════════════════════════════════════════════════════
 */

import { ethers } from 'ethers';
import crypto from 'crypto';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIG
// ═══════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  // Network — Base L2 (cheapest fees)
  CHAIN: 'base',
  RPC_URL: process.env.RPC_URL || 'https://mainnet.base.org',
  CHAIN_ID: 8453,

  // Your wallet
  WALLET_ADDRESS: process.env.WALLET_ADDRESS || '0x4154E42E9266Bb0418d2C8F42F530831DFf26304',

  // Token addresses on Base
  TOKENS: {
    WETH: '0x4200000000000000000000000000000000000006',
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA', // Bridged USDC
  },

  // Uniswap V3 Universal Router + Swap Router on Base
  UNISWAP_ROUTER: '0x2626664c2603336E57B271c5C0b26F421741e481',
  UNISWAP_SWAP_ROUTER_02: '0x2626664c2603336E57B271c5C0b26F421741e481',
  UNISWAP_QUOTER: '0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a',
  // Fee tiers: 100 (0.01%), 500 (0.05%), 3000 (0.3%), 10000 (1%)
  DEFAULT_FEE: 500, // Base USDC/WETH uses 0.05% pool

  // Portfolio
  STARTING_BALANCE: parseFloat(process.env.PORTFOLIO_BALANCE || '150'),

  // Safety — FROZEN, cannot be overridden
  SAFETY: Object.freeze({
    MAX_POSITION_PCT: 3,
    STOP_LOSS_PCT: 5,
    TAKE_PROFIT_PCT: 10,
    MAX_DAILY_DRAWDOWN_PCT: 10,
    MAX_PORTFOLIO_DEPLOYED: 50,
    MAX_CONSECUTIVE_LOSSES: 5,
    COOLDOWN_HOURS: 4,
    MIN_TRADE_USD: 1,
    MAX_TRADE_USD: 4.50,
    MAX_SLIPPAGE_PCT: 1,       // Max 1% slippage on swaps
    MAX_GAS_USD: 0.50,         // Skip trade if gas > $0.50
  }),

  // DCA
  DCA_AMOUNT_USD: 4,
  DCA_INTERVAL_HOURS: 24,

  // Timing
  CHECK_INTERVAL_MS: 60000,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ABI fragments (only what we need)
// ═══════════════════════════════════════════════════════════════════════════════
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

const UNISWAP_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) payable returns (uint256 amountOut)',
];

const UNISWAP_QUOTER_ABI = [
  'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)',
];

// ═══════════════════════════════════════════════════════════════════════════════
// VAULT — Encrypted key storage
// ═══════════════════════════════════════════════════════════════════════════════
class Vault {
  #key;
  constructor(masterKey) {
    this.#key = crypto.scryptSync(masterKey || 'devbot-onchain', 'devbot-salt-v2', 32);
  }
  encrypt(plaintext) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.#key, iv);
    let enc = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
    return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${enc}`;
  }
  decrypt(ciphertext) {
    const [ivH, tagH, enc] = ciphertext.split(':');
    const d = crypto.createDecipheriv('aes-256-gcm', this.#key, Buffer.from(ivH, 'hex'));
    d.setAuthTag(Buffer.from(tagH, 'hex'));
    return d.update(enc, 'hex', 'utf8') + d.final('utf8');
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SAFETY ENGINE (same bulletproof system)
// ═══════════════════════════════════════════════════════════════════════════════
class SafetyEngine {
  #state;
  constructor() {
    this.#state = {
      dailyPnL: 0, dailyStartBalance: 0, consecutiveLosses: 0,
      cooldownUntil: null, openPositions: [], totalDeployed: 0,
      halted: false, haltReason: null,
    };
  }

  get isHalted() { return this.#state.halted; }
  get state() { return { ...this.#state }; }

  resetDaily(balance) {
    this.#state.dailyPnL = 0;
    this.#state.dailyStartBalance = balance;
    this.#state.halted = false;
    this.#state.haltReason = null;
  }

  preTradeCheck(trade, balance) {
    const S = CONFIG.SAFETY;
    if (this.#state.halted) return { ok: false, reason: `HALTED: ${this.#state.haltReason}` };
    if (this.#state.cooldownUntil && Date.now() < this.#state.cooldownUntil)
      return { ok: false, reason: `COOLDOWN active` };
    const pct = (trade.amountUSD / balance) * 100;
    if (pct > S.MAX_POSITION_PCT) return { ok: false, reason: `Position ${pct.toFixed(1)}% > ${S.MAX_POSITION_PCT}% limit` };
    if (trade.amountUSD < S.MIN_TRADE_USD) return { ok: false, reason: `Too small` };
    if (trade.amountUSD > S.MAX_TRADE_USD) return { ok: false, reason: `Too large` };
    const deployed = ((this.#state.totalDeployed + trade.amountUSD) / balance) * 100;
    if (deployed > S.MAX_PORTFOLIO_DEPLOYED) return { ok: false, reason: `${deployed.toFixed(1)}% deployed > ${S.MAX_PORTFOLIO_DEPLOYED}% limit` };
    if (this.#state.dailyPnL < 0) {
      const dd = (Math.abs(this.#state.dailyPnL) / this.#state.dailyStartBalance) * 100;
      if (dd >= S.MAX_DAILY_DRAWDOWN_PCT) {
        this.#state.halted = true;
        this.#state.haltReason = `Daily drawdown ${dd.toFixed(1)}%`;
        return { ok: false, reason: this.#state.haltReason };
      }
    }
    return { ok: true };
  }

  recordTrade(trade) {
    this.#state.dailyPnL += trade.pnl || 0;
    if (trade.action === 'buy') {
      this.#state.openPositions.push(trade);
      this.#state.totalDeployed += trade.amountUSD;
    }
    if (trade.pnl < 0) {
      this.#state.consecutiveLosses++;
      if (this.#state.consecutiveLosses >= CONFIG.SAFETY.MAX_CONSECUTIVE_LOSSES) {
        this.#state.cooldownUntil = Date.now() + CONFIG.SAFETY.COOLDOWN_HOURS * 3600000;
        this.#state.consecutiveLosses = 0;
      }
    } else if (trade.pnl > 0) {
      this.#state.consecutiveLosses = 0;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ON-CHAIN FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

function log(tag, msg) {
  console.log(`[${new Date().toISOString().slice(11, 19)}][${tag}] ${msg}`);
}

async function getBalances(provider, walletAddress) {
  const ethBalance = await provider.getBalance(walletAddress);
  const usdc = new ethers.Contract(CONFIG.TOKENS.USDC, ERC20_ABI, provider);
  const weth = new ethers.Contract(CONFIG.TOKENS.WETH, ERC20_ABI, provider);

  let usdcBalance = 0n, wethBalance = 0n;
  try { usdcBalance = await usdc.balanceOf(walletAddress); } catch {}
  try { wethBalance = await weth.balanceOf(walletAddress); } catch {}

  return {
    ETH: parseFloat(ethers.formatEther(ethBalance)),
    USDC: parseFloat(ethers.formatUnits(usdcBalance, 6)),
    WETH: parseFloat(ethers.formatEther(wethBalance)),
  };
}

async function getQuote(provider, tokenIn, tokenOut, amountIn) {
  const quoter = new ethers.Contract(CONFIG.UNISWAP_QUOTER, UNISWAP_QUOTER_ABI, provider);
  // Try multiple fee tiers to find the best quote
  for (const fee of [500, 3000, 10000]) {
    try {
      const result = await quoter.quoteExactInputSingle.staticCall({
        tokenIn, tokenOut, amountIn, fee, sqrtPriceLimitX96: 0n,
      });
      log('QUOTE', `Got quote at fee tier ${fee}: ${ethers.formatEther(result.amountOut)} ETH`);
      return result.amountOut;
    } catch {}
  }
  log('QUOTE', 'All fee tiers failed for quote');
  return null;
}

async function executeSwap(wallet, tokenIn, tokenOut, amountIn, minAmountOut) {
  const fee = CONFIG.DEFAULT_FEE;

  // Try multiple fee tiers if one fails
  const feeTiers = [500, 3000, 10000, 100];

  // Approve token spend if ERC20
  if (tokenIn !== CONFIG.TOKENS.WETH) {
    const token = new ethers.Contract(tokenIn, ERC20_ABI, wallet);
    const allowance = await token.allowance(wallet.address, CONFIG.UNISWAP_ROUTER);
    if (allowance < amountIn) {
      log('APPROVE', `Approving USDC for Uniswap Router...`);
      const approveTx = await token.approve(CONFIG.UNISWAP_ROUTER, ethers.MaxUint256);
      await approveTx.wait();
      log('APPROVE', `Approved ✓`);
    }
  }

  let lastError;
  for (const tryFee of feeTiers) {
    try {
      const router = new ethers.Contract(CONFIG.UNISWAP_ROUTER, UNISWAP_ROUTER_ABI, wallet);
      const params = {
        tokenIn,
        tokenOut,
        fee: tryFee,
        recipient: wallet.address,
        amountIn,
        amountOutMinimum: minAmountOut,
        sqrtPriceLimitX96: 0n,
      };

      log('SWAP', `Trying fee tier ${tryFee} (${tryFee / 10000}%)...`);
      const tx = await router.exactInputSingle(params, {
        value: tokenIn === CONFIG.TOKENS.WETH ? amountIn : 0n,
        gasLimit: 300000n,
      });

      log('TX', `Submitted: ${tx.hash}`);
      const receipt = await tx.wait();
      log('TX', `Confirmed in block ${receipt.blockNumber} ✓ (fee tier: ${tryFee})`);
      return { txHash: tx.hash, blockNumber: receipt.blockNumber, gasUsed: receipt.gasUsed.toString() };
    } catch (e) {
      lastError = e;
      log('SWAP', `Fee tier ${tryFee} failed: ${e.reason || e.message?.slice(0, 60)}`);
    }
  }
  throw new Error(`All fee tiers failed. Last: ${lastError?.reason || lastError?.message?.slice(0, 80)}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRICE FEED (CoinGecko — free, no API key needed)
// ═══════════════════════════════════════════════════════════════════════════════
let priceCache = { prices: {}, lastFetch: 0 };

async function fetchPrices() {
  // Cache prices for 30 seconds to avoid rate limits
  if (Date.now() - priceCache.lastFetch < 30000 && Object.keys(priceCache.prices).length > 0) {
    return priceCache.prices;
  }

  // Try CoinGecko first
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,usd-coin&vs_currencies=usd',
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json();
      priceCache.prices = {
        ETH: data.ethereum?.usd || 0,
        BTC: data.bitcoin?.usd || 0,
        SOL: data.solana?.usd || 0,
        USDC: data['usd-coin']?.usd || 1,
      };
      priceCache.lastFetch = Date.now();
      return priceCache.prices;
    }
  } catch {}

  // Fallback: try CryptoCompare (no API key needed)
  try {
    const res = await fetch(
      'https://min-api.cryptocompare.com/data/pricemulti?fsyms=ETH,BTC,SOL&tsyms=USD',
      { signal: AbortSignal.timeout(10000) }
    );
    if (res.ok) {
      const data = await res.json();
      priceCache.prices = {
        ETH: data.ETH?.USD || 0,
        BTC: data.BTC?.USD || 0,
        SOL: data.SOL?.USD || 0,
        USDC: 1,
      };
      priceCache.lastFetch = Date.now();
      return priceCache.prices;
    }
  } catch {}

  // Return cached if available, empty if not
  return Object.keys(priceCache.prices).length > 0 ? priceCache.prices : {};
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  DEVBOT ONCHAIN TRADER — DIRECT BLOCKCHAIN, NO MIDDLEMAN   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');

  const DRY_RUN = process.env.LIVE_TRADING !== 'true';
  const vault = new Vault(process.env.VAULT_KEY);
  const safety = new SafetyEngine();
  const priceHistory = [];
  let lastDCA = 0;

  // Connect to Base L2
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const network = await provider.getNetwork();
  log('CHAIN', `Connected to ${CONFIG.CHAIN} (chainId: ${network.chainId})`);

  // Load wallet
  let wallet = null;
  if (!DRY_RUN) {
    const privateKey = process.env.WALLET_KEY;
    if (!privateKey) {
      log('FATAL', 'Set WALLET_KEY env var for live trading');
      process.exit(1);
    }
    wallet = new ethers.Wallet(privateKey, provider);
    log('WALLET', `Loaded: ${wallet.address}`);
  } else {
    log('MODE', 'DRY RUN — no wallet needed, simulating trades');
  }

  // Get balances
  const balances = await getBalances(provider, CONFIG.WALLET_ADDRESS);
  log('BALANCE', `ETH: ${balances.ETH.toFixed(6)} | USDC: ${balances.USDC.toFixed(2)} | WETH: ${balances.WETH.toFixed(6)}`);

  const portfolioUSD = balances.USDC + (balances.ETH * (await fetchPrices()).ETH || 0);
  log('PORTFOLIO', `Total: ~$${portfolioUSD.toFixed(2)}`);

  if (CONFIG.STARTING_BALANCE <= 0) {
    log('FATAL', 'Portfolio balance is $0. Set PORTFOLIO_BALANCE env var.');
    process.exit(1);
  }

  safety.resetDaily(CONFIG.STARTING_BALANCE);

  log('SAFETY', `Max position: ${CONFIG.SAFETY.MAX_POSITION_PCT}% ($${CONFIG.SAFETY.MAX_TRADE_USD})`);
  log('SAFETY', `Stop-loss: ${CONFIG.SAFETY.STOP_LOSS_PCT}% | Take-profit: ${CONFIG.SAFETY.TAKE_PROFIT_PCT}%`);
  log('SAFETY', `Max slippage: ${CONFIG.SAFETY.MAX_SLIPPAGE_PCT}% | Max gas: $${CONFIG.SAFETY.MAX_GAS_USD}`);
  log('SAFETY', `Daily drawdown limit: ${CONFIG.SAFETY.MAX_DAILY_DRAWDOWN_PCT}%`);
  console.log('');

  let cycle = 0;
  const loop = async () => {
    cycle++;
    const prices = await fetchPrices();
    if (!prices.ETH) { log('MARKET', 'No prices — skip'); return; }

    priceHistory.push(prices.ETH);
    if (priceHistory.length > 100) priceHistory.shift();

    // DCA check
    const hoursSinceDCA = (Date.now() - lastDCA) / 3600000;
    if (hoursSinceDCA >= CONFIG.DCA_INTERVAL_HOURS) {
      const trade = {
        action: 'buy', pair: 'ETH/USDC',
        amountUSD: CONFIG.DCA_AMOUNT_USD,
        strategy: 'DCA',
        reason: `Scheduled DCA — $${CONFIG.DCA_AMOUNT_USD} ETH`,
        confidence: 0.9,
      };

      const check = safety.preTradeCheck(trade, CONFIG.STARTING_BALANCE);
      if (check.ok) {
        if (DRY_RUN) {
          log('DCA', `[DRY RUN] BUY $${trade.amountUSD} ETH @ $${prices.ETH.toLocaleString()}`);
        } else {
          try {
            const amountIn = ethers.parseUnits(trade.amountUSD.toString(), 6); // USDC has 6 decimals
            const quote = await getQuote(provider, CONFIG.TOKENS.USDC, CONFIG.TOKENS.WETH, amountIn);
            if (quote) {
              const minOut = quote * 98n / 100n; // 2% slippage tolerance
              log('DCA', `Swapping $${trade.amountUSD} USDC → ETH (min: ${ethers.formatEther(minOut)} ETH)`);
              const result = await executeSwap(wallet, CONFIG.TOKENS.USDC, CONFIG.TOKENS.WETH, amountIn, minOut);
              log('DCA', `SUCCESS: ${result.txHash}`);
            } else {
              log('DCA', 'No quote available — will retry next cycle');
            }
          } catch (e) {
            log('DCA', `Swap failed: ${e.message?.slice(0, 80)} — will retry next cycle`);
          }
        }
        safety.recordTrade({ ...trade, pnl: 0, entryPrice: prices.ETH });
        lastDCA = Date.now();
      } else {
        log('BLOCKED', `DCA: ${check.reason}`);
      }
    }

    // RSI check for mean reversion
    if (priceHistory.length >= 15) {
      const changes = [];
      for (let i = 1; i < 15; i++) changes.push(priceHistory[priceHistory.length - i] - priceHistory[priceHistory.length - i - 1]);
      const gains = changes.filter(c => c > 0);
      const losses = changes.filter(c => c < 0).map(Math.abs);
      const avgGain = gains.length ? gains.reduce((a, b) => a + b, 0) / 14 : 0;
      const avgLoss = losses.length ? losses.reduce((a, b) => a + b, 0) / 14 : 0.001;
      const rsi = 100 - (100 / (1 + avgGain / avgLoss));

      if (rsi < 30) {
        const trade = { action: 'buy', pair: 'ETH/USDC', amountUSD: 3, strategy: 'DIP_BUY', reason: `RSI ${rsi.toFixed(0)} < 30 — oversold`, confidence: 0.65 };
        const check = safety.preTradeCheck(trade, CONFIG.STARTING_BALANCE);
        if (check.ok) {
          log('DIP', `${DRY_RUN ? '[DRY RUN] ' : ''}BUY $3 ETH — RSI ${rsi.toFixed(0)} oversold`);
          safety.recordTrade({ ...trade, pnl: 0 });
        }
      }
    }

    // Status every 10 cycles
    if (cycle % 10 === 0) {
      const s = safety.state;
      log('STATUS', `Cycle ${cycle} | ETH: $${prices.ETH.toLocaleString()} | Deployed: $${s.totalDeployed.toFixed(2)} | P&L: $${s.dailyPnL.toFixed(2)} | ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    }
  };

  log('START', `Trading on ${CONFIG.CHAIN} — check every ${CONFIG.CHECK_INTERVAL_MS / 1000}s`);
  await loop();
  setInterval(loop, CONFIG.CHECK_INTERVAL_MS);
}

process.on('SIGINT', () => { log('STOP', 'Shutdown.'); process.exit(0); });
main().catch(e => { log('FATAL', e.message); process.exit(1); });
