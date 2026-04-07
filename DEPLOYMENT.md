# Deployment Guide - Acquire Game on Base Sepolia

## 🌐 Network Information

**Base Sepolia Testnet**
- Chain ID: 84532
- RPC URL: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org
- Faucet: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet

## 📋 Prerequisites

### 1. Get Test ETH

You need Base Sepolia ETH to deploy. Get it from:
- **Coinbase Faucet**: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
- **Alchemy Faucet**: https://www.alchemy.com/faucets/base-sepolia
- **Bridge from Sepolia**: https://bridge.base.org/deposit

### 2. Configure Your Wallet

Add your private key to `.env`:
```bash
PRIVATE_KEY=your_private_key_here
```

⚠️ **NEVER commit your .env file or share your private key!**

### 3. Verify Configuration

Check your `.env` file has:
```bash
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

## 🚀 Deployment Steps

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Compile Contracts

```bash
npm run compile
```

This will compile the AcquireGame contract with Fhenix FHE support.

### Step 3: Deploy to Base Sepolia

```bash
npm run deploy
```

Or explicitly:
```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

### Step 4: Save Contract Address

The deployment script will automatically:
- ✅ Save contract address to `deployments/baseSepolia.json`
- ✅ Export ABI to `frontend/AcquireGame.abi.json`
- ✅ Display the contract address and explorer link

Copy the contract address from the output!

### Step 5: Update Configuration Files

**Update `.env`:**
```bash
CONTRACT_ADDRESS=0xYourDeployedContractAddress
RPC_URL=https://sepolia.base.org
```

**Update `frontend/app.js`:**
Find and replace:
```javascript
const CONTRACT_ADDRESS = 'YOUR_CONTRACT_ADDRESS_HERE';
```

With:
```javascript
const CONTRACT_ADDRESS = '0xYourDeployedContractAddress';
```

**Update `notification-server.js`:**
The server will read from `.env` automatically.

## 🔍 Verify Deployment

### Check on Block Explorer

Visit: `https://sepolia.basescan.org/address/YOUR_CONTRACT_ADDRESS`

You should see:
- Contract creation transaction
- Contract bytecode
- ABI (if verified)

### Verify Contract (Optional)

To verify your contract on Basescan:

```bash
npx hardhat verify --network baseSepolia YOUR_CONTRACT_ADDRESS
```

## 🧪 Test the Deployment

### 1. Start Notification Server

```bash
npm run notify
```

Should output:
```
Notification server running on port 3001
Monitoring game events...
```

### 2. Start Frontend

```bash
npm run serve
```

Should output:
```
Starting up http-server, serving frontend
Available on:
  http://127.0.0.1:8080
```

### 3. Connect Wallet

1. Open http://localhost:8080
2. Connect your wallet with Dynamic
3. Switch to Base Sepolia network
4. Start a game!

## 🐛 Troubleshooting

### "Insufficient funds for gas"

**Solution**: Get more Base Sepolia ETH from faucets listed above.

### "Network mismatch"

**Solution**: Make sure your wallet is connected to Base Sepolia (Chain ID: 84532).

### "Contract not found"

**Solution**: 
1. Check the contract address is correct
2. Wait a few seconds for the transaction to confirm
3. Verify on block explorer

### "Transaction reverted"

**Solution**: 
1. Check you have enough gas
2. Verify contract is deployed correctly
3. Check function parameters are correct

### Dynamic wallet not connecting

**Solution**:
1. Verify environment ID is correct in `dynamic-init.js`
2. Check browser console for errors
3. Try different wallet (MetaMask, Coinbase Wallet, etc.)

## 📊 Contract Interaction

### Read Functions (No gas required)

- `getCurrentPlayer()` - Get current player's address
- `getPlayerCount()` - Get number of players
- `players(uint256)` - Get player info by index
- `getGameState()` - Get overall game state

### Write Functions (Requires gas)

- `joinGame()` - Join a game
- `placeTile(uint8 x, uint8 y)` - Place a tile
- `buyShares(HotelChain chain, uint8 amount)` - Buy shares
- `endGame()` - End the game (when conditions met)

## 🔐 Security Notes

1. **Private Keys**: Never commit or share your private key
2. **Testnet Only**: This is for testing - don't use mainnet keys
3. **Gas Limits**: Set reasonable gas limits to avoid overspending
4. **Contract Verification**: Verify contracts for transparency

## 📈 Gas Costs (Approximate)

On Base Sepolia:
- Deploy Contract: ~0.001-0.005 ETH
- Join Game: ~0.0001-0.0003 ETH
- Place Tile: ~0.0001-0.0003 ETH
- Buy Shares: ~0.0001-0.0003 ETH

Base has low gas fees compared to Ethereum mainnet!

## 🌟 Production Deployment

For mainnet deployment:

1. **Audit Contract**: Get professional security audit
2. **Test Thoroughly**: Complete testing on testnet
3. **Use Multisig**: Deploy with multisig wallet
4. **Monitor**: Set up monitoring and alerts
5. **Insurance**: Consider smart contract insurance

## 📚 Additional Resources

- [Base Documentation](https://docs.base.org/)
- [Fhenix CoFHE Docs](https://cofhe-docs.fhenix.zone/)
- [Hardhat Documentation](https://hardhat.org/docs)
- [Dynamic Documentation](https://docs.dynamic.xyz/)

## 🤝 Support

Having issues? Check:
1. This troubleshooting section
2. Browser console logs
3. Notification server logs
4. Block explorer transaction details

Happy deploying! 🚀
