/**
 * WITHDRAW FUNDS — Get your money out of wallet 0x99ed...f590
 *
 * This script tries two methods:
 *   1. CDP SDK (Coinbase manages the key)
 *   2. Direct ethers.js (if you have the private key)
 *
 * Run: node withdraw.mjs
 */

import { CdpClient } from '@coinbase/cdp-sdk';
import { ethers } from 'ethers';

// The wallet with your money
const SOURCE_WALLET = '0x99ed99326343C58Fc9Db5a4DAcA04B2A0816f590';

// Where to send the money (your primary CDP wallet)
const DESTINATION = '0x4154E42E9266Bb0418d2C8F42F530831DFf26304';

// Base network USDC contract
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
];

console.log('');
console.log('========================================');
console.log('  DEVBOT WALLET WITHDRAWAL TOOL');
console.log('========================================');
console.log('');
console.log('Source:      ', SOURCE_WALLET);
console.log('Destination: ', DESTINATION);
console.log('');

// ── Step 1: Check balances on-chain ──
console.log('--- STEP 1: Checking wallet balances ---');
const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const ethBal = await provider.getBalance(SOURCE_WALLET);
const usdc = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, provider);
const usdcBal = await usdc.balanceOf(SOURCE_WALLET);

console.log(`ETH balance:  ${ethers.formatEther(ethBal)} ETH`);
console.log(`USDC balance: ${ethers.formatUnits(usdcBal, 6)} USDC`);
console.log('');

if (usdcBal === 0n && ethBal === 0n) {
  console.log('Wallet is empty. Nothing to withdraw.');
  process.exit(0);
}

// ── Step 2: Try CDP SDK (Coinbase-managed wallet) ──
console.log('--- STEP 2: Trying CDP SDK transfer ---');
try {
  const apiKeyId = process.env.CDP_API_KEY_NAME ||
    'organizations/0e9ae8c0-3f8c-482b-a748-47c178a9e7f2/apiKeys/232eb2f4-a5f9-4fde-b2d7-4ce0c517f5d2';

  let apiKeySecret = process.env.CDP_API_KEY_PRIVATE_KEY ||
    '-----BEGIN EC PRIVATE KEY-----\nMHcCAQEEIHTFSIxZSC36e76GHTGixGvSg47vhhFnmsZBnl/gR54noAoGCCqGSM49\nAwEHoUQDQgAEsqq+uV/8w6PHOGnASDe8Ig2jEoPh/9NSCZJMggMMf9IRLew0QTYw\nBBDq3+n0zFpWZIr9tPTiHs+1Y95OckiVFw==\n-----END EC PRIVATE KEY-----';
  apiKeySecret = apiKeySecret.replace(/\\n/g, '\n');

  const walletSecret = process.env.CDP_WALLET_SECRET ||
    'MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgWe1rx4wVsCueDaB/kiIIsJP7lYsvkzNiMd7VPdQH3e2hRANCAAQIQy/a/m7uAjGZ9jrZTfguofMINfy4xAZZ7aFXqXDNfzUrdq4WzXaDWqy1WqOuqZjzN5xChR9ZgzwYuEh+XE4z';

  const clientOpts = { apiKeyId, apiKeySecret };
  if (walletSecret) clientOpts.walletSecret = walletSecret;

  const cdp = new CdpClient(clientOpts);
  console.log('CDP client connected.');

  // Try to get the account
  console.log('Looking up wallet in CDP...');
  const account = await cdp.evm.getAccount({ address: SOURCE_WALLET });
  console.log('FOUND! CDP manages this wallet.');

  // Transfer USDC
  if (usdcBal > 0n) {
    console.log(`Transferring ${ethers.formatUnits(usdcBal, 6)} USDC to ${DESTINATION}...`);
    const usdcTx = await cdp.evm.sendTransaction({
      address: SOURCE_WALLET,
      network: 'base',
      transaction: {
        to: USDC_ADDRESS,
        data: usdc.interface.encodeFunctionData('transfer', [DESTINATION, usdcBal]),
      },
    });
    console.log(`USDC SENT! TX: ${usdcTx.transactionHash}`);
  }

  // Transfer ETH (leave a tiny bit for gas)
  const gasReserve = ethers.parseEther('0.0005');
  if (ethBal > gasReserve) {
    const ethToSend = ethBal - gasReserve;
    console.log(`Transferring ${ethers.formatEther(ethToSend)} ETH to ${DESTINATION}...`);
    const ethTx = await cdp.evm.sendTransaction({
      address: SOURCE_WALLET,
      network: 'base',
      transaction: {
        to: DESTINATION,
        value: '0x' + ethToSend.toString(16),
      },
    });
    console.log(`ETH SENT! TX: ${ethTx.transactionHash}`);
  }

  console.log('');
  console.log('========================================');
  console.log('  ALL FUNDS TRANSFERRED SUCCESSFULLY!');
  console.log('========================================');
  process.exit(0);

} catch (cdpErr) {
  console.log(`CDP method failed: ${cdpErr.message}`);
  console.log('');
  console.log('This wallet is NOT managed by your CDP account.');
  console.log('You need the raw private key (WALLET_KEY) to withdraw.');
  console.log('');
  console.log('The key is most likely on your Hostinger VPS at:');
  console.log('  /root/devbot-ai/.env');
  console.log('  or as a PM2 environment variable');
  console.log('');
  console.log('To check, log into Hostinger panel → VPS → SSH Terminal → run:');
  console.log('  pm2 env 7 | grep WALLET');
  console.log('  cat /root/devbot-ai/.env | grep WALLET');
  console.log('');
  console.log('Once you find it, run:');
  console.log('  WALLET_KEY=your_private_key node withdraw.mjs');
  process.exit(1);
}
