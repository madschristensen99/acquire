# 🎮 Acquire Game - Quick Start Guide

## Run Full Game Test (Recommended)

```bash
npm run test:game
```

This single command will:
1. ✅ Deploy a fresh contract to Arbitrum Sepolia
2. ✅ Register 4 players with $6000 each
3. ✅ Start the game and deal tiles
4. ✅ Execute 10+ tile placements
5. ✅ Purchase shares in hotel chains
6. ✅ End the game
7. ✅ Display final standings and winner
8. ✅ Show complete gas cost analysis

**Expected time:** 3-5 minutes  
**Expected cost:** ~0.0006-0.0008 ETH on Arbitrum Sepolia

## What You'll See

```
======================================================================
🎮 ACQUIRE GAME - FULL GAME SIMULATION (Simple Version)
======================================================================

🌐 Network: arbitrum-sepolia (Chain ID: 421614)
🚀 Deploying AcquireGameSimple contract...
✅ Contract deployed at: 0x...

----------------------------------------------------------------------
PHASE 1: PLAYER REGISTRATION
----------------------------------------------------------------------
👤 Registering Player 0...
   ✅ Confirmed! Gas: 150000
   💰 Starting cash: $6000

[Players 1-3 join...]

----------------------------------------------------------------------
PHASE 2: GAME INITIALIZATION
----------------------------------------------------------------------
🎬 Starting game...
   ✅ Confirmed! Gas: 500000

----------------------------------------------------------------------
PHASE 3: TILE PLACEMENT
----------------------------------------------------------------------
🎲 Move 1/10: First tile
   Position: (5, 4)
   👤 Current player: 0
   ✅ Confirmed! Gas: 200000
   🏨 Tile placed: true, Chain: 0

[More moves...]

----------------------------------------------------------------------
PHASE 4: SHARE TRADING
----------------------------------------------------------------------
💰 Player 0 buying 5 shares of chain 1
   Cash before: $6000
   ✅ Confirmed! Gas: 150000
   Cash after: $5500
   Shares owned: 5

[More purchases...]

----------------------------------------------------------------------
PHASE 5: GAME CONCLUSION
----------------------------------------------------------------------
🏁 Ending game...
   ✅ Confirmed! Gas: 100000

🏆 FINAL STANDINGS:
   ==================================================
   🥇 1. Player 2: $5700
   🥈 2. Player 0: $5500
   🥉 3. Player 1: $5400
   4️⃣ 4. Player 3: $6000

   Winner: Player 2 with $5700!

----------------------------------------------------------------------
PHASE 6: TRANSACTION ANALYSIS
----------------------------------------------------------------------
💸 Transaction Cost Summary:
   Total Gas Used: 3,245,678
   Total Cost: 0.00065 ETH

✅ FULL GAME SIMULATION COMPLETED SUCCESSFULLY!
```

## Other Test Commands

### Verify Existing Deployment
```bash
npm run test:verify
```
Checks your deployed contract at `0x075a1eB6F22390a69525363DDc1b0a372e8Be780`

### Local Testing (No Testnet Funds)
```bash
npm run test:local
```
Runs tests on local Hardhat network

## Prerequisites

1. **Testnet ETH**: Get Arbitrum Sepolia ETH from:
   - https://faucet.quicknode.com/arbitrum/sepolia
   - https://www.alchemy.com/faucets/arbitrum-sepolia

2. **Environment Setup**: Your `.env` should have:
   ```
   PRIVATE_KEY=your_private_key_here
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   ```

## Files Created

- `test/AcquireGameSimple.test.js` - Main test file ⭐
- `test/helpers/testUtils.js` - Helper utilities
- `contracts/AcquireGameSimple.sol` - Non-FHE contract
- `test/README.md` - Full documentation
- `TEST_SUITE_SUMMARY.md` - Complete overview

## Need Help?

See `TEST_SUITE_SUMMARY.md` for detailed information about:
- Test coverage
- Gas costs
- Troubleshooting
- FHE vs Simple version differences

## 🎯 That's It!

Just run `npm run test:game` and watch a complete Acquire game play out on Arbitrum Sepolia testnet! 🚀
