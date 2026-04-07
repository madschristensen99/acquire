# Acquire Game - Fhenix FHE Implementation

A blockchain implementation of the classic Acquire board game using Fhenix's Fully Homomorphic Encryption (FHE) to keep player hands and cash private.

## Features

- **Private Player Data**: Player tiles, cash, and shares are encrypted using FHE
- **On-chain Game Logic**: All game rules enforced by smart contract
- **2-6 Players**: Supports standard Acquire player count
- **Hotel Chain Management**: Form and manage hotel chains on a 12x9 board
- **Share Trading**: Buy and sell shares in hotel chains

## Game Mechanics

The contract implements core Acquire gameplay:
- Players join the game and receive initial cash (encrypted)
- Each player gets 6 random tiles (encrypted)
- Players take turns placing tiles on the board
- Adjacent tiles form hotel chains
- Players can purchase shares in hotel chains
- Game ends when triggered by players

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Add your private key to `.env`

4. Compile the contract:
```bash
npm run compile
```

## Deployment

Deploy to Fhenix testnet:
```bash
npm run deploy
```

Deploy to local network:
```bash
npm run deploy:local
```

## Contract Structure

### Key Components

- **Player**: Stores encrypted player data (cash, tiles, shares)
- **BoardTile**: Represents board state with encrypted hotel chain info
- **GameState**: Tracks game progress and current player

### Main Functions

- `joinGame()`: Join a game before it starts
- `startGame()`: Initialize the game with 2-6 players
- `placeTile()`: Place a tile on the board (encrypted tile index)
- `purchaseShares()`: Buy shares in a hotel chain (encrypted)
- `getPlayerCash()`: View your encrypted cash balance
- `getPlayerShares()`: View your encrypted share holdings
- `getPlayerTile()`: View one of your encrypted tiles

## Privacy Features

All sensitive player data is encrypted using Fhenix FHE:
- Player cash balances
- Tile holdings
- Share counts
- Board state (hotel chains)

Players can only decrypt their own data using permission-based access control.

## Technology Stack

- **Solidity 0.8.19**: Smart contract language
- **Fhenix Protocol**: FHE encryption library
- **Hardhat**: Development environment
- **Ethers.js**: Ethereum interaction library

## License

MIT
