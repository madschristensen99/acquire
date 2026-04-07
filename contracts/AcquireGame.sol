// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@fhenixprotocol/contracts/FHE.sol";
import "@fhenixprotocol/contracts/access/Permissioned.sol";

contract AcquireGame is Permissioned {
    uint8 constant BOARD_WIDTH = 12;
    uint8 constant BOARD_HEIGHT = 9;
    uint8 constant MAX_PLAYERS = 6;
    uint8 constant TILES_PER_PLAYER = 6;
    uint8 constant MAX_HOTEL_CHAINS = 7;
    
    enum HotelChain { NONE, TOWER, LUXOR, AMERICAN, WORLDWIDE, FESTIVAL, IMPERIAL, CONTINENTAL }
    
    struct Player {
        address playerAddress;
        euint32 cash;
        euint8[TILES_PER_PLAYER] tiles;
        euint8[MAX_HOTEL_CHAINS] shares;
        bool isActive;
    }
    
    struct BoardTile {
        euint8 hotelChain;
        ebool isPlaced;
    }
    
    struct GameState {
        uint8 playerCount;
        uint8 currentPlayerIndex;
        bool gameStarted;
        bool gameEnded;
    }
    
    mapping(uint256 => Player) public players;
    mapping(uint256 => mapping(uint256 => BoardTile)) public board;
    mapping(uint8 => euint32) public hotelChainSizes;
    mapping(uint8 => ebool) public hotelChainActive;
    
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
        players[playerId].cash = FHE.asEuint32(6000);
        players[playerId].isActive = true;
        
        for (uint8 i = 0; i < MAX_HOTEL_CHAINS; i++) {
            players[playerId].shares[i] = FHE.asEuint8(0);
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
            hotelChainSizes[i] = FHE.asEuint32(0);
            hotelChainActive[i] = FHE.asEbool(false);
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
            }
        }
    }
    
    function placeTile(inEuint8 calldata encryptedTileIndex, uint8 x, uint8 y, Permission calldata permission) 
        external 
        onlySender(permission) 
    {
        require(gameState.gameStarted && !gameState.gameEnded, "Game not active");
        require(x < BOARD_WIDTH && y < BOARD_HEIGHT, "Invalid coordinates");
        
        uint256 playerId = _getPlayerIdByAddress(msg.sender);
        require(playerId < gameState.playerCount, "Not a player");
        require(playerId == gameState.currentPlayerIndex, "Not your turn");
        
        euint8 tileIndex = FHE.asEuint8(encryptedTileIndex);
        
        uint256 boardIndex = y * BOARD_WIDTH + x;
        board[x][y].isPlaced = FHE.asEbool(true);
        board[x][y].hotelChain = FHE.asEuint8(uint8(HotelChain.NONE));
        
        _checkAndFormHotelChain(x, y);
        
        _nextTurn();
        
        emit TilePlaced(playerId, x, y);
    }
    
    function _checkAndFormHotelChain(uint8 x, uint8 y) private {
        uint8 adjacentCount = 0;
        uint8 adjacentChain = uint8(HotelChain.NONE);
        
        if (x > 0) {
            adjacentCount++;
        }
        if (x < BOARD_WIDTH - 1) {
            adjacentCount++;
        }
        if (y > 0) {
            adjacentCount++;
        }
        if (y < BOARD_HEIGHT - 1) {
            adjacentCount++;
        }
        
        if (adjacentCount >= 2) {
            for (uint8 i = 1; i <= MAX_HOTEL_CHAINS; i++) {
                ebool isActive = hotelChainActive[i];
                euint8 activeValue = FHE.select(isActive, FHE.asEuint8(0), FHE.asEuint8(1));
                uint8 decryptedActive = FHE.decrypt(activeValue);
                
                if (decryptedActive == 1) {
                    board[x][y].hotelChain = FHE.asEuint8(i);
                    hotelChainActive[i] = FHE.asEbool(true);
                    hotelChainSizes[i] = FHE.add(hotelChainSizes[i], FHE.asEuint32(1));
                    emit HotelChainFormed(i, x, y);
                    break;
                }
            }
        }
    }
    
    function purchaseShares(inEuint8 calldata encryptedChainId, inEuint32 calldata encryptedAmount, Permission calldata permission) 
        external 
        onlySender(permission) 
    {
        require(gameState.gameStarted && !gameState.gameEnded, "Game not active");
        
        uint256 playerId = _getPlayerIdByAddress(msg.sender);
        require(playerId < gameState.playerCount, "Not a player");
        
        euint8 chainId = FHE.asEuint8(encryptedChainId);
        euint32 amount = FHE.asEuint32(encryptedAmount);
        
        euint32 shareCost = FHE.mul(amount, FHE.asEuint32(100));
        
        players[playerId].cash = FHE.sub(players[playerId].cash, shareCost);
        players[playerId].shares[FHE.decrypt(chainId)] = FHE.add(
            players[playerId].shares[FHE.decrypt(chainId)], 
            FHE.asEuint8(FHE.decrypt(amount))
        );
        
        emit SharesPurchased(playerId, FHE.decrypt(chainId), FHE.decrypt(amount));
    }
    
    function getPlayerCash(uint256 playerId, Permission calldata permission) 
        external 
        view 
        onlySender(permission) 
        returns (string memory) 
    {
        require(players[playerId].playerAddress == msg.sender, "Not your data");
        return FHE.sealoutput(players[playerId].cash, permission.publicKey);
    }
    
    function getPlayerShares(uint256 playerId, uint8 chainId, Permission calldata permission) 
        external 
        view 
        onlySender(permission) 
        returns (string memory) 
    {
        require(players[playerId].playerAddress == msg.sender, "Not your data");
        return FHE.sealoutput(players[playerId].shares[chainId], permission.publicKey);
    }
    
    function getPlayerTile(uint256 playerId, uint8 tileIndex, Permission calldata permission) 
        external 
        view 
        onlySender(permission) 
        returns (string memory) 
    {
        require(players[playerId].playerAddress == msg.sender, "Not your data");
        require(tileIndex < TILES_PER_PLAYER, "Invalid tile index");
        return FHE.sealoutput(players[playerId].tiles[tileIndex], permission.publicKey);
    }
    
    function _getPlayerIdByAddress(address playerAddr) private view returns (uint256) {
        for (uint256 i = 0; i < gameState.playerCount; i++) {
            if (players[i].playerAddress == playerAddr) {
                return i;
            }
        }
        return type(uint256).max;
    }
    
    function _nextTurn() private {
        gameState.currentPlayerIndex = uint8((gameState.currentPlayerIndex + 1) % gameState.playerCount);
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
}
