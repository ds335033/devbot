#!/usr/bin/env python3
"""Upload and run withdrawal script on VPS"""
import paramiko

VPS_HOST = '76.13.251.32'
VPS_USER = 'root'
VPS_PASS = 'DArren@235032@'

WITHDRAW_SCRIPT = r'''#!/usr/bin/env python3
import os
os.environ["CDP_API_KEY_NAME"] = "6d76de0c-5def-492d-9945-ae6f45543fbd"
os.environ["CDP_API_KEY_PRIVATE_KEY"] = "HLV0jYQKF9/YjCkUf4iaMz3nVZnpvbaImcRQLguJ5tyFoWhtJcQDXVBhpU3sEnJGQl4UK7ax5lzjyhfsbhPZYg=="
os.environ["CDP_WALLET_SECRET"] = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgWe1rx4wVsCueDaB/kiIIsJP7lYsvkzNiMd7VPdQH3e2hRANCAAQIQy/a/m7uAjGZ9jrZTfguofMINfy4xAZZ7aFXqXDNfzUrdq4WzXaDWqy1WqOuqZjzN5xChR9ZgzwYuEh+XE4z"
os.environ["NETWORK_ID"] = "base-mainnet"

DESTINATION = "0x4154E42E9266Bb0418d2C8F42F530831DFf26304"

print("=" * 50)
print("  DEVBOT WITHDRAWAL TOOL")
print("=" * 50)

try:
    from coinbase_agentkit import CdpEvmWalletProvider, CdpEvmWalletProviderConfig
    print("AgentKit loaded OK")
except ImportError:
    print("ERROR: coinbase_agentkit not installed")
    print("Trying cdp_agentkit_core...")
    try:
        from cdp_agentkit_core.providers import CdpEvmWalletProvider, CdpEvmWalletProviderConfig
        print("cdp_agentkit_core loaded OK")
    except ImportError:
        print("Neither agentkit package found. Trying direct CDP SDK...")
        try:
            from cdp import Cdp, Wallet
            print("CDP SDK loaded")
            Cdp.configure(
                api_key_name=os.environ["CDP_API_KEY_NAME"],
                api_key_private_key=os.environ["CDP_API_KEY_PRIVATE_KEY"]
            )
            # List wallets
            print("Listing wallets...")
            # Try to fetch wallet
            print("CDP SDK doesn't easily list wallets. Need agentkit.")
            exit(1)
        except ImportError:
            print("No CDP packages found at all!")
            exit(1)

try:
    config = CdpEvmWalletProviderConfig(
        api_key_id=os.environ["CDP_API_KEY_NAME"],
        api_key_secret=os.environ["CDP_API_KEY_PRIVATE_KEY"],
        wallet_secret=os.environ["CDP_WALLET_SECRET"],
        network_id="base-mainnet"
    )
    wp = CdpEvmWalletProvider(config)
    addr = wp.get_address()
    print(f"Wallet address: {addr}")

    # Get balance
    balance = wp.get_balance()
    print(f"Balance: {balance}")

    # Transfer all USDC to destination
    print(f"Transferring funds to {DESTINATION}...")

    # Try native transfer
    result = wp.native_transfer(DESTINATION, "0.001")
    print(f"Transfer result: {result}")

    print("SUCCESS!")
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc()
'''

print("Connecting to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(VPS_HOST, username=VPS_USER, password=VPS_PASS, timeout=15)
print("Connected!")

# Upload script
sftp = ssh.open_sftp()
with sftp.file('/root/withdraw_funds.py', 'w') as f:
    f.write(WITHDRAW_SCRIPT)
sftp.close()
print("Script uploaded.")

# Run it in the venv
cmd = 'cd /root/onchain-trader && source venv/bin/activate && python3 /root/withdraw_funds.py 2>&1'
stdin, stdout, stderr = ssh.exec_command(cmd, timeout=60)
stdout.channel.settimeout(60)
output = stdout.read().decode().strip()
print(output)

ssh.close()
print("\nDone.")
