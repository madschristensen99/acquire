# Contract Verification Guide

## Automatic Verification

The deployment script now **automatically verifies** contracts on block explorers after deployment!

### What Happens During Deployment

1. ✅ Contract deploys to the network
2. ⏳ Waits 30 seconds for block confirmations
3. 🔍 Automatically verifies on the block explorer
4. ✅ Shows verification status

### Setup Required

Add your API key to `.env`:

```bash
# For Arbitrum Sepolia
ARBISCAN_API_KEY=your_api_key_here

# For Base Sepolia  
BASESCAN_API_KEY=your_api_key_here

# For Ethereum Sepolia
ETHERSCAN_API_KEY=your_api_key_here
```

### Get API Keys

**Arbitrum (Arbiscan):**
1. Go to https://arbiscan.io/myapikey
2. Sign up/login
3. Create a new API key
4. Copy to `.env` as `ARBISCAN_API_KEY`

**Base (Basescan):**
1. Go to https://basescan.org/myapikey
2. Sign up/login
3. Create a new API key
4. Copy to `.env` as `BASESCAN_API_KEY`

**Ethereum (Etherscan):**
1. Go to https://etherscan.io/myapikey
2. Sign up/login
3. Create a new API key
4. Copy to `.env` as `ETHERSCAN_API_KEY`

## Deploy with Auto-Verification

```bash
# Deploy to Arbitrum Sepolia (auto-verifies)
npm run deploy

# Deploy to Base Sepolia (auto-verifies)
npm run deploy -- --network baseSepolia

# Deploy to Fhenix (auto-verifies if supported)
npm run deploy:fhenix
```

## Manual Verification

If automatic verification fails, you can verify manually:

```bash
# Arbitrum Sepolia
npx hardhat verify --network arbitrumSepolia <CONTRACT_ADDRESS>

# Base Sepolia
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

## Example Output

```
🚀 Deploying AcquireGame contract to arbitrumSepolia...
📝 Deploying with account: 0x...
💰 Account balance: 0.59 ETH
⏳ Deploying AcquireGameCoFHE contract...

✅ AcquireGameCoFHE deployed to: 0xec2F6363d2605D1979C8875b84df241D20C930C6

📄 Contract info saved to: deployments/arbitrumSepolia.json
📄 ABI exported to: frontend/AcquireGame.abi.json

🔍 View on explorer: https://sepolia.arbiscan.io/address/0xec2F6363d2605D1979C8875b84df241D20C930C6

🔍 Verifying contract on block explorer...
⏳ Waiting 30 seconds for block confirmations...
✅ Contract verified successfully!

✨ Deployment complete!
```

## Verification Benefits

✅ **Source code visible** on block explorer  
✅ **Users can read** contract functions  
✅ **Increased trust** and transparency  
✅ **Better debugging** with readable code  
✅ **Easier integration** for other developers  

## Troubleshooting

### "Already Verified"
- Contract was already verified (this is fine!)

### "Verification failed"
- Check your API key is correct
- Make sure you have the right network selected
- Try manual verification command shown in output

### "Invalid API Key"
- Get a new API key from the block explorer
- Make sure it's in your `.env` file
- Restart your terminal after adding the key

## Networks Supported

| Network | Explorer | API Key Variable |
|---------|----------|------------------|
| Arbitrum Sepolia | arbiscan.io | `ARBISCAN_API_KEY` |
| Base Sepolia | basescan.org | `BASESCAN_API_KEY` |
| Ethereum Sepolia | etherscan.io | `ETHERSCAN_API_KEY` |

## Current Deployment

**Latest Verified Contract:**
- Address: `0xec2F6363d2605D1979C8875b84df241D20C930C6`
- Network: Arbitrum Sepolia
- View: https://sepolia.arbiscan.io/address/0xec2F6363d2605D1979C8875b84df241D20C930C6

---

**Note:** Verification is automatic but requires an API key. Get yours from the block explorer and add to `.env`!
