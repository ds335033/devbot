/**
 * DevBot AI — Encrypted API Key Vault
 *
 * Secure storage for user API keys (Coinbase, Binance, etc.)
 * Uses AES-256-GCM encryption — keys are NEVER stored in plaintext.
 *
 * This is the foundation for Revenue Stream #42: Crypto Trading Bot API
 */

import crypto from 'crypto';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VAULT_DIR = resolve(__dirname, '../../data/vault');
mkdirSync(VAULT_DIR, { recursive: true });

// ─── Encryption Config ───────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;
const ITERATIONS = 100000;

/**
 * Derive a 256-bit encryption key from the master secret + per-user salt
 */
function deriveKey(masterSecret, salt) {
  return crypto.pbkdf2Sync(masterSecret, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

/**
 * Get the master encryption key (from env or generate one)
 */
function getMasterKey() {
  const key = process.env.VAULT_MASTER_KEY;
  if (!key) {
    console.warn('[Vault] WARNING: VAULT_MASTER_KEY not set — using fallback. SET THIS IN PRODUCTION!');
    return 'devbot-vault-default-key-change-me-in-production-2026';
  }
  return key;
}

// ─── Encrypt / Decrypt ───────────────────────────────────────────────────────

/**
 * Encrypt a plaintext string
 * Returns: { encrypted, iv, authTag, salt } — all base64 encoded
 */
export function encrypt(plaintext) {
  const masterKey = getMasterKey();
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = deriveKey(masterKey, salt);
  const iv = crypto.randomBytes(IV_LENGTH);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  const authTag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    salt: salt.toString('base64'),
  };
}

/**
 * Decrypt an encrypted object back to plaintext
 */
export function decrypt(encryptedObj) {
  const masterKey = getMasterKey();
  const salt = Buffer.from(encryptedObj.salt, 'base64');
  const key = deriveKey(masterKey, salt);
  const iv = Buffer.from(encryptedObj.iv, 'base64');
  const authTag = Buffer.from(encryptedObj.authTag, 'base64');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedObj.encrypted, 'base64', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// ─── Vault Storage ───────────────────────────────────────────────────────────

function loadVault() {
  const path = resolve(VAULT_DIR, 'keys.json');
  if (!existsSync(path)) return { users: {} };
  return JSON.parse(readFileSync(path, 'utf8'));
}

function saveVault(data) {
  writeFileSync(resolve(VAULT_DIR, 'keys.json'), JSON.stringify(data, null, 2));
}

/**
 * Store an encrypted API key for a user
 * @param {string} userId - User email or ID
 * @param {string} provider - e.g. 'coinbase', 'binance', 'kraken'
 * @param {string} keyName - e.g. 'api_key', 'api_secret', 'oauth_token'
 * @param {string} plainValue - The actual secret value
 */
export function storeKey(userId, provider, keyName, plainValue) {
  const vault = loadVault();

  if (!vault.users[userId]) {
    vault.users[userId] = { providers: {}, createdAt: new Date().toISOString() };
  }

  if (!vault.users[userId].providers[provider]) {
    vault.users[userId].providers[provider] = { keys: {}, addedAt: new Date().toISOString() };
  }

  // Encrypt and store
  vault.users[userId].providers[provider].keys[keyName] = {
    ...encrypt(plainValue),
    storedAt: new Date().toISOString(),
    lastRotated: new Date().toISOString(),
  };

  saveVault(vault);
  return true;
}

/**
 * Retrieve and decrypt an API key
 */
export function retrieveKey(userId, provider, keyName) {
  const vault = loadVault();

  const user = vault.users[userId];
  if (!user) return null;

  const prov = user.providers[provider];
  if (!prov) return null;

  const keyData = prov.keys[keyName];
  if (!keyData) return null;

  try {
    return decrypt(keyData);
  } catch (err) {
    console.error(`[Vault] Decryption failed for ${userId}/${provider}/${keyName}:`, err.message);
    return null;
  }
}

/**
 * Delete a stored key
 */
export function deleteKey(userId, provider, keyName) {
  const vault = loadVault();
  const user = vault.users[userId];
  if (!user?.providers?.[provider]?.keys?.[keyName]) return false;

  delete vault.users[userId].providers[provider].keys[keyName];

  // Clean up empty providers
  if (Object.keys(vault.users[userId].providers[provider].keys).length === 0) {
    delete vault.users[userId].providers[provider];
  }

  saveVault(vault);
  return true;
}

/**
 * List all providers for a user (without revealing key values)
 */
export function listUserKeys(userId) {
  const vault = loadVault();
  const user = vault.users[userId];
  if (!user) return [];

  return Object.entries(user.providers).map(([provider, data]) => ({
    provider,
    keys: Object.keys(data.keys),
    addedAt: data.addedAt,
  }));
}

/**
 * Rotate a key (re-encrypt with new salt/iv)
 */
export function rotateKey(userId, provider, keyName) {
  const plainValue = retrieveKey(userId, provider, keyName);
  if (!plainValue) return false;

  // Re-encrypt with fresh salt + IV
  storeKey(userId, provider, keyName, plainValue);
  return true;
}

export const Vault = {
  encrypt,
  decrypt,
  storeKey,
  retrieveKey,
  deleteKey,
  listUserKeys,
  rotateKey,
};
