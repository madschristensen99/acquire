// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {FHE, euint8, euint32, InEuint8, InEuint32} from "@fhenixprotocol/cofhe-contracts/FHE.sol";

contract AcquireGameCoFHE {
    uint8 constant BOARD_WIDTH = 12;
    uint8 constant BOARD_HEIGHT = 9;
    uint8 constant MAX_PLAYERS = 6;
    uint8 constant TILES_PER_PLAYER = 6;
    uint8 constant MAX_HOTEL_CHAINS = 7;
    
    enum HotelChain { NONE, TOWER, LUXOR, AMERICAN, WORLDWIDE, FESTIVAL, IMPERIAL, CONTINENTAL }
    
    struct Player {
        address playerAddress;
        uint32 cash;
        euint8[TILES_PER_PLAYER] tiles;  // PRIVATE: Player's hand of tiles
        uint8[MAX_HOTEL_CHAINS] shares;   // PUBLIC: Share ownership is visible
        bool isActive;
    }
    
    struct BoardTile {
        uint8 hotelChain;  // Public for game logic
        bool isPlaced;     // Public for game logic
    }
    
    struct GameState {
        uint8 playerCount;
        uint8 currentPlayerIndex;
        bool gameStarted;
        bool gameEnded;
        bool tilePlacedThisTurn;
    }
    
    mapping(uint256 => Player) public players;
    mapping(uint256 => mapping(uint256 => BoardTile)) public board;
    mapping(uint8 => uint32) public hotelChainSizes;  // Public for game logic
    mapping(uint8 => bool) public hotelChainActive;   // Public for game logic
    
    GameState public gameState;
    
    event GameCreated(address creator);
    event PlayerJoined(address player, uint256 playerId);
    event GameStarted();
    event TilePlaced(uint256 playerId, uint8 x, uint8 y);
    event HotelChainFormed(uint8 chainId, uint8 x, uint8 y);
    event SharesPurchased(uint256 playerId, uint8 chainId, uint32 amount);
    event GameEnded(address winner);
    
    constructor() {
        gameState.playerCount = 0;
        gameState.currentPlayerIndex = 0;
        gameState.gameStarted = false;
        gameState.gameEnded = false;
    }
    
    function joinGame() external returns (uint256) {
        require(!gameState.gameStarted, "Game already started");
        require(gameState.playerCount < MAX_PLAYERS, "Game is full");
        
        uint256 playerId = gameState.playerCount;
        
        players[playerId].playerAddress = msg.sender;
        players[playerId].cash = 6000;
        players[playerId].isActive = true;
        
        // Initialize shares to 0 (PUBLIC - no encryption needed)
        for (uint8 i = 0; i < MAX_HOTEL_CHAINS; i++) {
            players[playerId].shares[i] = 0;
        }
        
        gameState.playerCount++;
        
        emit PlayerJoined(msg.sender, playerId);
        return playerId;
    }
    
    function startGame() external {
        require(gameState.playerCount >= 2, "Need at least 2 players");
        require(!gameState.gameStarted, "Game already started");
        
        gameState.gameStarted = true;
        
        for (uint8 i = 0; i < MAX_HOTEL_CHAINS; i++) {
            hotelChainSizes[i] = 0;
            hotelChainActive[i] = false;
        }
        
        _dealInitialTiles();
        
        emit GameStarted();
    }
    
    function _dealInitialTiles() private {
        for (uint256 p = 0; p < gameState.playerCount; p++) {
            for (uint8 t = 0; t < TILES_PER_PLAYER; t++) {
                uint256 randomValue = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, p, t)));
                uint8 tileId = uint8(randomValue % (BOARD_WIDTH * BOARD_HEIGHT));
                players[p].tiles[t] = FHE.asEuint8(tileId);
                FHE.allowThis(players[p].tiles[t]);
                FHE.allowSender(players[p].tiles[t]);
            }
        }
    }
    
    function placeTile(uint8 tileIndex, uint8 x, uint8 y) external {
        require(gameState.gameStarted && !gameState.gameEnded, "Game not active");
        require(x < BOARD_WIDTH && y < BOARD_HEIGHT, "Invalid coordinates");
        
        // Check if it's the current player's turn
        require(players[gameState.currentPlayerIndex].playerAddress == msg.sender, "Not your turn");
        require(!gameState.tilePlacedThisTurn, "Already placed tile this turn");
        require(tileIndex < TILES_PER_PLAYER, "Invalid tile index");
        require(!board[x][y].isPlaced, "Tile already placed");
        
        uint256 playerId = gameState.currentPlayerIndex;
        
        board[x][y].isPlaced = true;
        board[x][y].hotelChain = uint8(HotelChain.NONE);
        
        _checkAndFormHotelChain(x, y);
        
        // Mark that tile has been placed this turn
        gameState.tilePlacedThisTurn = true;
        
        emit TilePlaced(playerId, x, y);
    }
    
    function _checkAndFormHotelChain(uint8 x, uint8 y) private {
        uint8 adjacentCount = 0;
        uint8 adjacentChain = uint8(HotelChain.NONE);
        
        // Check adjacent tiles
        if (x > 0 && board[x-1][y].isPlaced) {
            adjacentCount++;
            if (board[x-1][y].hotelChain != uint8(HotelChain.NONE)) {
                adjacentChain = board[x-1][y].hotelChain;
            }
        }
        if (x < BOARD_WIDTH - 1 && board[x+1][y].isPlaced) {
            adjacentCount++;
            if (board[x+1][y].hotelChain != uint8(HotelChain.NONE)) {
                adjacentChain = board[x+1][y].hotelChain;
            }
        }
        if (y > 0 && board[x][y-1].isPlaced) {
            adjacentCount++;
            if (board[x][y-1].hotelChain != uint8(HotelChain.NONE)) {
                adjacentChain = board[x][y-1].hotelChain;
            }
        }
        if (y < BOARD_HEIGHT - 1 && board[x][y+1].isPlaced) {
            adjacentCount++;
            if (board[x][y+1].hotelChain != uint8(HotelChain.NONE)) {
                adjacentChain = board[x][y+1].hotelChain;
            }
        }
        
        // Form or extend chain
        if (adjacentCount >= 1) {
            if (adjacentChain != uint8(HotelChain.NONE)) {
                // Extend existing chain
                board[x][y].hotelChain = adjacentChain;
                hotelChainSizes[adjacentChain]++;
            } else {
                // Form new chain
                for (uint8 i = 1; i <= MAX_HOTEL_CHAINS; i++) {
                    if (!hotelChainActive[i]) {
                        board[x][y].hotelChain = i;
                        hotelChainActive[i] = true;
                        hotelChainSizes[i] = 2;
                        emit HotelChainFormed(i, x, y);
                        break;
                    }
                }
            }
        }
    }
    
    function purchaseShares(uint8 chainId, uint32 amount) external {
        require(gameState.gameStarted && !gameState.gameEnded, "Game not active");
        require(chainId > 0 && chainId <= MAX_HOTEL_CHAINS, "Invalid chain");
        require(hotelChainActive[chainId], "Chain not active");
        
        // REAL ACQUIRE RULE: Can only buy shares on your turn after placing a tile
        require(players[gameState.currentPlayerIndex].playerAddress == msg.sender, "Not your turn");
        require(gameState.tilePlacedThisTurn, "Must place tile before buying shares");
        
        uint256 playerId = gameState.currentPlayerIndex;
        
        uint32 shareCost = amount * 100;
        require(players[playerId].cash >= shareCost, "Insufficient cash");
        
        players[playerId].cash -= shareCost;
        
        // Add shares (PUBLIC - everyone can see share ownership)
        players[playerId].shares[chainId] += uint8(amount);
        
        emit SharesPurchased(playerId, chainId, amount);
    }
    
    function getPlayerCash(uint256 playerId) external view returns (uint32) {
        return players[playerId].cash;
    }
    
    function getPlayerShares(uint256 playerId, uint8 chainId) external view returns (uint8) {
        // PUBLIC: Anyone can see share ownership (like real Acquire)
        return players[playerId].shares[chainId];
    }
    
    function getPlayerTile(uint256 playerId, uint8 tileIndex) external view returns (euint8) {
        // PRIVATE: Only the player can see their own tiles
        require(players[playerId].playerAddress == msg.sender, "Not your data");
        require(tileIndex < TILES_PER_PLAYER, "Invalid tile index");
        return players[playerId].tiles[tileIndex];
    }
    
    function getBoardTile(uint8 x, uint8 y) external view returns (bool isPlaced, uint8 hotelChain) {
        require(x < BOARD_WIDTH && y < BOARD_HEIGHT, "Invalid coordinates");
        return (board[x][y].isPlaced, board[x][y].hotelChain);
    }
    
    function _getPlayerIdByAddress(address playerAddr) private view returns (uint256) {
        for (uint256 i = 0; i < gameState.playerCount; i++) {
            if (players[i].playerAddress == playerAddr) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    function endTurn() external {
        require(gameState.gameStarted && !gameState.gameEnded, "Game not active");
        require(players[gameState.currentPlayerIndex].playerAddress == msg.sender, "Not your turn");
        require(gameState.tilePlacedThisTurn, "Must place tile before ending turn");
        
        _nextTurn();
    }
    
    function _nextTurn() private {
        gameState.currentPlayerIndex = uint8((gameState.currentPlayerIndex + 1) % gameState.playerCount);
        gameState.tilePlacedThisTurn = false;
    }
    
    function endGame() external {
        require(gameState.gameStarted && !gameState.gameEnded, "Game not active");
        
        gameState.gameEnded = true;
        
        emit GameEnded(msg.sender);
    }
    
    function getCurrentPlayer() external view returns (address) {
        return players[gameState.currentPlayerIndex].playerAddress;
    }
    
    function getPlayerCount() external view returns (uint8) {
        return gameState.playerCount;
    }
    
    function getHotelChainSize(uint8 chainId) external view returns (uint32) {
        require(chainId <= MAX_HOTEL_CHAINS, "Invalid chain");
        return hotelChainSizes[chainId];
    }
    
    function isHotelChainActive(uint8 chainId) external view returns (bool) {
        require(chainId <= MAX_HOTEL_CHAINS, "Invalid chain");
        return hotelChainActive[chainId];
    }
}
