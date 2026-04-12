#!/usr/bin/env python3
"""Find wallet 0x99ed in CDP accounts"""
import asyncio
from cdp import CdpClient

API_KEY_ID = "organizations/0e9ae8c0-3f8c-482b-a748-47c178a9e7f2/apiKeys/aa8534f8-e2f8-4854-9550-8da2da8fab7f"
API_KEY_SECRET = """-----BEGIN EC PRIVATE KEY-----
MHcCAQEEICSk+wYZO6xLT8nhOmStcNNDeggXvbTVfsGluU++itktoAoGCCqGSM49
AwEHoUQDQgAEX3566sC3vH4BoMwda0PuIskpyyZF1HYchgq/jvUhg5ynSiPY38PA
GAGOV+Ckke22snmGbmMo5avjpzKH+e3UyQ==
-----END EC PRIVATE KEY-----"""
WALLET_SECRET = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgWe1rx4wVsCueDaB/kiIIsJP7lYsvkzNiMd7VPdQH3e2hRANCAAQIQy/a/m7uAjGZ9jrZTfguofMINfy4xAZZ7aFXqXDNfzUrdq4WzXaDWqy1WqOuqZjzN5xChR9ZgzwYuEh+XE4z"

TARGET = "0x99ed99326343C58Fc9Db5a4DAcA04B2A0816f590"

async def main():
    client = CdpClient(api_key_id=API_KEY_ID, api_key_secret=API_KEY_SECRET, wallet_secret=WALLET_SECRET)
    print("CDP connected OK")

    # Try to get the target account directly
    print("Looking for " + TARGET + " ...")
    try:
        account = await client.evm.get_account(address=TARGET)
        print("FOUND: " + str(account.address))
    except Exception as e:
        print("get_account: " + str(e)[:120])

    # Try known names
    print("")
    print("Searching by account names...")
    names = ["default", "devbot", "devbot-trading", "onchain-trader",
             "primary", "main", "trading", "bot", "wallet",
             "devbot-kooks2350-gmail-com",
             "devbot-guitargiveawaychannel345-gmail-com"]
    for name in names:
        try:
            acc = await client.evm.get_or_create_account(name=name)
            addr = acc.address
            match = " *** MATCH ***" if addr.lower() == TARGET.lower() else ""
            print("  " + name + ": " + addr + match)
        except Exception as e:
            print("  " + name + ": ERROR " + str(e)[:80])

    # List all accounts if possible
    print("")
    print("Listing all accounts...")
    try:
        result = await client.evm.list_accounts()
        for acc in result:
            addr = acc.address if hasattr(acc, "address") else str(acc)
            match = " *** MATCH ***" if TARGET.lower() in str(addr).lower() else ""
            print("  " + str(addr) + match)
    except Exception as e:
        print("list_accounts: " + str(e)[:120])

asyncio.run(main())
