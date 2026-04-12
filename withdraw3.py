#!/usr/bin/env python3
"""Withdraw funds using fresh CDP API key"""
import os

API_KEY_ID = "organizations/0e9ae8c0-3f8c-482b-a748-47c178a9e7f2/apiKeys/aa8534f8-e2f8-4854-9550-8da2da8fab7f"

API_KEY_SECRET = (
    "-----BEGIN EC PRIVATE KEY-----\n"
    "MHcCAQEEICSk+wYZO6xLT8nhOmStcNNDeggXvbTVfsGluU++itktoAoGCCqGSM49\n"
    "AwEHoUQDQgAEX3566sC3vH4BoMwda0PuIskpyyZF1HYchgq/jvUhg5ynSiPY38PA\n"
    "GAGOV+Ckke22snmGbmMo5avjpzKH+e3UyQ==\n"
    "-----END EC PRIVATE KEY-----\n"
)

WALLET_SECRET = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgWe1rx4wVsCueDaB/kiIIsJP7lYsvkzNiMd7VPdQH3e2hRANCAAQIQy/a/m7uAjGZ9jrZTfguofMINfy4xAZZ7aFXqXDNfzUrdq4WzXaDWqy1WqOuqZjzN5xChR9ZgzwYuEh+XE4z"

DESTINATION = "0x4154E42E9266Bb0418d2C8F42F530831DFf26304"

print("=" * 50)
print("  DEVBOT WITHDRAWAL - FRESH API KEY")
print("=" * 50)

try:
    from coinbase_agentkit import CdpEvmWalletProvider, CdpEvmWalletProviderConfig
    print("AgentKit loaded")

    config = CdpEvmWalletProviderConfig(
        api_key_id=API_KEY_ID,
        api_key_secret=API_KEY_SECRET,
        wallet_secret=WALLET_SECRET,
        network_id="base-mainnet"
    )
    wp = CdpEvmWalletProvider(config)
    addr = wp.get_address()
    print(f"Connected! Wallet: {addr}")

    # Check balance
    try:
        bal = wp.get_balance()
        print(f"Balance: {bal}")
    except Exception as e:
        print(f"Balance check: {e}")

    # Transfer USDC
    USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
    print(f"Transferring all USDC to {DESTINATION}...")

    try:
        tx = wp.send_transaction(
            to=USDC,
            data="0xa9059cbb" + DESTINATION[2:].lower().zfill(64) + hex(184731881)[2:].zfill(64),
        )
        print(f"USDC Transfer TX: {tx}")
    except Exception as e:
        print(f"USDC transfer error: {e}")
        # Try native transfer for ETH
        try:
            print("Trying ETH transfer instead...")
            tx = wp.native_transfer(DESTINATION, "0.001")
            print(f"ETH Transfer TX: {tx}")
        except Exception as e2:
            print(f"ETH transfer error: {e2}")

    print("DONE")

except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
