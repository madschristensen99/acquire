const { expect } = require("chai");
const { ethers } = require("hardhat");
const { GameTestHelper, setupTestPlayers, displayNetworkInfo } = require("./helpers/testUtils");

describe("🎮 Full Game Integration Test - Arbitrum Sepolia", function () {
  const DEPLOYED_ADDRESS = "0x075a1eB6F22390a69525363DDc1b0a372e8Be780";
  
  let game;
  let helper;
  let players;
  let signers;
  let receipts = [];
  
  before(async function () {
    this.timeout(60000);
    
    console.log("\n" + "=".repeat(60));
    console.log("🎮 ACQUIRE GAME - FULL INTEGRATION TEST");
    console.log("=".repeat(60));
    
    await displayNetworkInfo();
    
    signers = await ethers.getSigners();
    console.log(`\n👥 Available signers: ${signers.length}`);
    
    const AcquireGame = await ethers.getContractFactory("AcquireGame");
    game = AcquireGame.attach(DEPLOYED_ADDRESS);
    
    helper = new GameTestHelper(game);
    
    console.log(`\n📍 Contract Address: ${DEPLOYED_ADDRESS}`);
    console.log(`🔗 Explorer: https://sepolia.arbiscan.io/address/${DEPLOYED_ADDRESS}`);
  });

  describe("Phase 1: Pre-Game Setup", function () {
    it("Should display initial contract state", async function () {
      this.timeout(30000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 1: PRE-GAME SETUP");
      console.log("-".repeat(60));
      
      await helper.displayGameState();
      
      const balance = await ethers.provider.getBalance(DEPLOYED_ADDRESS);
      console.log(`\n💎 Contract Balance: ${ethers.formatEther(balance)} ETH`);
    });

    it("Should setup test players", async function () {
      this.timeout(30000);
      
      players = await setupTestPlayers(signers, 4);
      
      console.log("\n👥 Test Players Setup:");
      players.forEach((p, i) => {
        console.log(`   Player ${i}: ${p.address.substring(0, 20)}...`);
      });
      
      expect(players.length).to.be.greaterThan(1);
    });
  });

  describe("Phase 2: Player Registration", function () {
    it("Should register all players", async function () {
      this.timeout(300000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 2: PLAYER REGISTRATION");
      console.log("-".repeat(60));
      
      const initialPlayerCount = await game.getPlayerCount();
      console.log(`\n📊 Initial player count: ${initialPlayerCount}`);
      
      for (let i = 0; i < players.length; i++) {
        console.log(`\n👤 Registering Player ${i}...`);
        
        const result = await helper.safeExecute(async () => {
          const tx = await game.connect(players[i].signer).joinGame({
            gasLimit: 500000
          });
          
          const receipt = await helper.waitForTransaction(tx, `Player ${i} joining`);
          receipts.push(receipt);
          
          const cash = await game.getPlayerCash(i);
          console.log(`   💰 Starting cash: $${cash}`);
          
          return receipt;
        }, `Player ${i} registration`);
        
        if (!result) {
          console.log(`   ℹ️  Player ${i} may already be registered`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const finalPlayerCount = await game.getPlayerCount();
      console.log(`\n✅ Final player count: ${finalPlayerCount}`);
      
      expect(Number(finalPlayerCount)).to.be.greaterThan(0);
    });

    it("Should verify all player balances", async function () {
      this.timeout(30000);
      
      await helper.displayPlayerBalances();
      
      const playerCount = await game.getPlayerCount();
      expect(Number(playerCount)).to.be.greaterThan(1);
    });
  });

  describe("Phase 3: Game Initialization", function () {
    it("Should start the game", async function () {
      this.timeout(120000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 3: GAME INITIALIZATION");
      console.log("-".repeat(60));
      
      const result = await helper.safeExecute(async () => {
        console.log("\n🎬 Starting game...");
        
        const tx = await game.connect(signers[0]).startGame({
          gasLimit: 2000000
        });
        
        const receipt = await helper.waitForTransaction(tx, "Game start");
        receipts.push(receipt);
        
        return receipt;
      }, "Game start");
      
      if (!result) {
        console.log("   ℹ️  Game may already be started");
      }
      
      await helper.displayGameState();
      
      const gameState = await game.gameState();
      expect(gameState.gameStarted).to.be.true;
    });

    it("Should verify game is ready for play", async function () {
      this.timeout(30000);
      
      const currentPlayer = await helper.getCurrentPlayer();
      console.log(`\n🎯 Current turn: Player ${currentPlayer.index}`);
      console.log(`   Address: ${currentPlayer.address}`);
      
      const gameState = await game.gameState();
      expect(gameState.gameStarted).to.be.true;
      expect(gameState.gameEnded).to.be.false;
    });
  });

  describe("Phase 4: Gameplay - Tile Placement", function () {
    const tileMoves = [
      { x: 5, y: 4, description: "Center tile" },
      { x: 6, y: 4, description: "Adjacent horizontal" },
      { x: 5, y: 5, description: "Adjacent vertical" },
      { x: 7, y: 4, description: "Extend chain" },
      { x: 4, y: 4, description: "Extend other direction" },
      { x: 5, y: 3, description: "Vertical extension" },
      { x: 8, y: 5, description: "New isolated tile" },
      { x: 3, y: 3, description: "Another isolated tile" },
    ];

    it("Should execute multiple tile placements", async function () {
      this.timeout(600000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 4: GAMEPLAY - TILE PLACEMENT");
      console.log("-".repeat(60));
      
      let successfulMoves = 0;
      
      for (let i = 0; i < tileMoves.length; i++) {
        const move = tileMoves[i];
        
        console.log(`\n🎲 Move ${i + 1}/${tileMoves.length}: ${move.description}`);
        console.log(`   Coordinates: (${move.x}, ${move.y})`);
        
        const gameState = await game.gameState();
        
        if (gameState.gameEnded) {
          console.log("   🏁 Game has ended");
          break;
        }
        
        const currentPlayerIndex = Number(gameState.currentPlayerIndex);
        const currentPlayer = players[currentPlayerIndex];
        
        if (!currentPlayer) {
          console.log(`   ⚠️  Player ${currentPlayerIndex} not in test set`);
          continue;
        }
        
        console.log(`   👤 Current player: ${currentPlayerIndex}`);
        
        const result = await helper.safeExecute(async () => {
          const encryptedTileIndex = helper.createEncryptedValue(0);
          const permission = helper.createMockPermission();
          
          const tx = await game.connect(currentPlayer.signer).placeTile(
            encryptedTileIndex,
            move.x,
            move.y,
            permission,
            {
              gasLimit: 1000000
            }
          );
          
          const receipt = await helper.waitForTransaction(tx, "Tile placement");
          receipts.push(receipt);
          
          successfulMoves++;
          return receipt;
        }, `Move ${i + 1}`);
        
        if (result) {
          await helper.verifyTilePlacement(move.x, move.y);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log(`\n✅ Successful moves: ${successfulMoves}/${tileMoves.length}`);
      expect(successfulMoves).to.be.greaterThan(0);
    });

    it("Should display game state after tile placements", async function () {
      this.timeout(30000);
      
      await helper.displayGameState();
      await helper.displayPlayerBalances();
    });
  });

  describe("Phase 5: Share Trading", function () {
    const sharePurchases = [
      { playerId: 0, chainId: 1, amount: 3, description: "Player 0 buys Tower shares" },
      { playerId: 1, chainId: 1, amount: 2, description: "Player 1 buys Tower shares" },
      { playerId: 0, chainId: 2, amount: 5, description: "Player 0 buys Luxor shares" },
      { playerId: 2, chainId: 1, amount: 4, description: "Player 2 buys Tower shares" },
    ];

    it("Should execute share purchases", async function () {
      this.timeout(300000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 5: SHARE TRADING");
      console.log("-".repeat(60));
      
      let successfulPurchases = 0;
      
      for (let i = 0; i < sharePurchases.length; i++) {
        const purchase = sharePurchases[i];
        
        if (purchase.playerId >= players.length) {
          console.log(`\n⚠️  Skipping purchase ${i + 1}: Player ${purchase.playerId} not available`);
          continue;
        }
        
        console.log(`\n💰 Purchase ${i + 1}/${sharePurchases.length}: ${purchase.description}`);
        
        const gameState = await game.gameState();
        if (gameState.gameEnded) {
          console.log("   🏁 Game has ended");
          break;
        }
        
        const player = players[purchase.playerId];
        const cashBefore = await game.getPlayerCash(purchase.playerId);
        console.log(`   💵 Cash before: $${cashBefore}`);
        
        const result = await helper.safeExecute(async () => {
          const encryptedChainId = helper.createEncryptedValue(purchase.chainId);
          const encryptedAmount = helper.createEncryptedValue(purchase.amount);
          const permission = helper.createMockPermission();
          
          const tx = await game.connect(player.signer).purchaseShares(
            encryptedChainId,
            encryptedAmount,
            permission,
            {
              gasLimit: 500000
            }
          );
          
          const receipt = await helper.waitForTransaction(tx, "Share purchase");
          receipts.push(receipt);
          
          successfulPurchases++;
          return receipt;
        }, `Purchase ${i + 1}`);
        
        if (result) {
          const cashAfter = await game.getPlayerCash(purchase.playerId);
          console.log(`   💵 Cash after: $${cashAfter}`);
          console.log(`   💸 Cost: $${cashBefore - cashAfter}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`\n✅ Successful purchases: ${successfulPurchases}/${sharePurchases.length}`);
    });

    it("Should display updated player balances", async function () {
      this.timeout(30000);
      
      await helper.displayPlayerBalances();
    });
  });

  describe("Phase 6: Game Conclusion", function () {
    it("Should end the game", async function () {
      this.timeout(90000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 6: GAME CONCLUSION");
      console.log("-".repeat(60));
      
      const result = await helper.safeExecute(async () => {
        console.log("\n🏁 Ending game...");
        
        const tx = await game.connect(signers[0]).endGame({
          gasLimit: 300000
        });
        
        const receipt = await helper.waitForTransaction(tx, "Game end");
        receipts.push(receipt);
        
        return receipt;
      }, "Game end");
      
      if (!result) {
        console.log("   ℹ️  Game may already be ended");
      }
      
      await helper.displayGameState();
      
      const gameState = await game.gameState();
      expect(gameState.gameEnded).to.be.true;
    });

    it("Should display final standings", async function () {
      this.timeout(30000);
      
      console.log("\n🏆 FINAL STANDINGS:");
      console.log("   ===============");
      
      await helper.displayPlayerBalances();
      
      const playerCount = await game.getPlayerCount();
      const standings = [];
      
      for (let i = 0; i < Number(playerCount); i++) {
        const cash = await game.getPlayerCash(i);
        standings.push({ playerId: i, cash: Number(cash) });
      }
      
      standings.sort((a, b) => b.cash - a.cash);
      
      console.log("\n   Ranking:");
      standings.forEach((s, index) => {
        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "  ";
        console.log(`   ${medal} ${index + 1}. Player ${s.playerId}: $${s.cash}`);
      });
    });
  });

  describe("Phase 7: Transaction Analysis", function () {
    it("Should analyze all transaction costs", async function () {
      this.timeout(30000);
      
      console.log("\n" + "-".repeat(60));
      console.log("PHASE 7: TRANSACTION ANALYSIS");
      console.log("-".repeat(60));
      
      const validReceipts = receipts.filter(r => r !== null);
      
      if (validReceipts.length > 0) {
        await helper.displayTransactionCosts(validReceipts);
      } else {
        console.log("\n   ℹ️  No transaction receipts to analyze");
      }
      
      console.log(`\n📊 Total transactions executed: ${validReceipts.length}`);
    });

    it("Should display player ETH balances", async function () {
      this.timeout(30000);
      
      console.log("\n⚡ Player ETH Balances:");
      console.log("   ===================");
      
      for (let i = 0; i < players.length; i++) {
        const balance = await ethers.provider.getBalance(players[i].address);
        console.log(`   Player ${i}: ${ethers.formatEther(balance)} ETH`);
      }
    });

    it("Should verify contract state integrity", async function () {
      this.timeout(30000);
      
      console.log("\n🔍 Contract State Verification:");
      console.log("   ============================");
      
      const gameState = await game.gameState();
      const playerCount = await game.getPlayerCount();
      
      console.log(`   ✓ Player count: ${playerCount}`);
      console.log(`   ✓ Game started: ${gameState.gameStarted}`);
      console.log(`   ✓ Game ended: ${gameState.gameEnded}`);
      
      expect(gameState.playerCount).to.equal(playerCount);
    });
  });

  after(function () {
    console.log("\n" + "=".repeat(60));
    console.log("✅ FULL GAME INTEGRATION TEST COMPLETED");
    console.log("=".repeat(60));
    console.log(`\n📍 Contract: ${DEPLOYED_ADDRESS}`);
    console.log(`🔗 View on Explorer: https://sepolia.arbiscan.io/address/${DEPLOYED_ADDRESS}\n`);
  });
});
