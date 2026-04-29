# Acquire Game - Test Suite

This directory contains comprehensive integration tests for the Acquire game smart contract deployed on Arbitrum Sepolia.

## Test Files

### 1. `AcquireGame.test.js`
Basic integration test that covers:
- Player joining
- Game initialization
- Tile placement
- Share purchasing
- Game ending
- State verification

### 2. `FullGameIntegration.test.js`
Comprehensive full game simulation with:
- Multi-phase game flow
- Detailed transaction tracking
- Gas cost analysis
- Player standings
- Complete game lifecycle

### 3. `helpers/testUtils.js`
Utility functions for testing:
- `GameTestHelper` - Main helper class
- `setupTestPlayers` - Player setup
- `displayNetworkInfo` - Network information
- Transaction helpers

## Running Tests

### Prerequisites
1. Ensure you have testnet ETH on Arbitrum Sepolia
2. Configure your `.env` file with:
   ```
   PRIVATE_KEY=your_private_key
   ARBITRUM_SEPOLIA_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
   ```

### Run Full Integration Test
```bash
npm run test:full
```

This will execute the complete game simulation including:
- Player registration (up to 4 players)
- Game start
- Multiple tile placements
- Share purchases
- Game conclusion
- Transaction cost analysis

### Run Basic Test
```bash
npm run test:basic
```

Runs the basic integration test suite.

### Run All Tests Locally
```bash
npm run test:local
```

## Test Phases

### Phase 1: Pre-Game Setup
- Display contract state
- Setup test players
- Verify network connection

### Phase 2: Player Registration
- Register 3-4 players
- Verify starting balances ($6000 each)
- Check player count

### Phase 3: Game Initialization
- Start the game
- Deal initial tiles
- Verify game state

### Phase 4: Tile Placement
- Execute 8+ tile placements
- Test chain formation
- Verify turn rotation

### Phase 5: Share Trading
- Purchase shares in different hotel chains
- Verify cash deductions
- Track share ownership

### Phase 6: Game Conclusion
- End the game
- Display final standings
- Rank players by cash

### Phase 7: Transaction Analysis
- Calculate total gas costs
- Display ETH spent
- Verify contract integrity

## Expected Output

The tests provide detailed console output including:
- 🎮 Game state updates
- 💰 Player balances
- ⛽ Gas costs
- 🏆 Final rankings
- 📊 Transaction summaries

## Contract Address

**Arbitrum Sepolia:** `0x075a1eB6F22390a69525363DDc1b0a372e8Be780`

[View on Arbiscan](https://sepolia.arbiscan.io/address/0x075a1eB6F22390a69525363DDc1b0a372e8Be780)

## Notes

- Tests use real testnet funds
- Each test includes timeout extensions for network delays
- Failed transactions are logged but don't stop the test suite
- All transactions are tracked for cost analysis
- Tests can be run multiple times on the same contract

## Troubleshooting

### "Game already started"
The contract may already have an active game. Tests handle this gracefully.

### "Not your turn"
Turn rotation is automatic. Tests verify the current player before each move.

### "Insufficient cash"
Players start with $6000. Share purchases are limited by available cash.

### Gas estimation failures
Tests use fixed gas limits as fallback when estimation fails.

## Gas Costs (Approximate)

- Join Game: ~150,000 gas
- Start Game: ~500,000 gas
- Place Tile: ~200,000 gas
- Purchase Shares: ~150,000 gas
- End Game: ~100,000 gas

Total for full game: ~2-3M gas (~0.001-0.002 ETH on Arbitrum Sepolia)
