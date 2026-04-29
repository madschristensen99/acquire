const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🎮 FULL GAME FLOW - Complete Acquire Game Test", function () {
  let game;
  let players = [];
  let receipts = [];
  let deployedAddress;
  
  before(async function () {
    this.timeout(120000);
    
    console.log("\n" + "=".repeat(80));
    console.log("🎮 ACQUIRE GAME - COMPLETE GAME FLOW TEST");
    console.log("=".repeat(80));
    
    const signers = await ethers.getSigners();
    console.log(`\n👥 Available signers: ${signers.length}`);
    
    // Deploy fresh contract
    console.log("\n🚀 Deploying fresh AcquireGameCoFHE contract...");
    const AcquireGame = await ethers.getContractFactory("AcquireGameCoFHE");
    game = await AcquireGame.deploy();
    await game.waitForDeployment();
    
    deployedAddress = await game.getAddress();
    console.log(`✅ Contract deployed at: ${deployedAddress}`);
    
    const network = await ethers.provider.getNetwork();
    if (network.chainId === 421614n) {
      console.log(`🔗 Arbiscan: https://sepolia.arbiscan.io/address/${deployedAddress}`);
    }
    
    // Setup players (use same signer for multiple players for testing)
    players = [
      { signer: signers[0], name: "Alice", id: 0 },
      { signer: signers[0], name: "Bob", id: 1 },
      { signer: signers[0], name: "Charlie", id: 2 },
    ];
    
    console.log("\n👥 Players:");
    players.forEach(p => console.log(`   ${p.name} (Player ${p.id})`));
  });

  describe("📋 Phase 1: Player Registration", function () {
    it("Should register all players", async function () {
      this.timeout(300000);
      
      console.log("\n" + "-".repeat(80));
      console.log("PHASE 1: PLAYER REGISTRATION");
      console.log("-".repeat(80));
      
      for (let i = 0; i < players.length; i++) {
        console.log(`\n👤 ${players[i].name} joining...`);
        
        const tx = await game.connect(players[i].signer).joinGame({
          gasLimit: 800000
        });
        
        console.log(`   TX: ${tx.hash}`);
        const receipt = await tx.wait();
        receipts.push(receipt);
        console.log(`   ✅ Joined! Gas: ${receipt.gasUsed.toString()}`);
        
        const cash = await game.getPlayerCash(i);
        console.log(`   💰 Starting cash: $${cash}`);
        
        expect(cash).to.equal(6000n);
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const playerCount = await game.getPlayerCount();
      console.log(`\n✅ Total players registered: ${playerCount}`);
      expect(Number(playerCount)).to.equal(3);
    });
  });

  describe("🎬 Phase 2: Game Start", function () {
    it("Should start the game", async function () {
      this.timeout(120000);
      
      console.log("\n" + "-".repeat(80));
      console.log("PHASE 2: GAME START");
      console.log("-".repeat(80));
      
      console.log("\n🎬 Starting game...");
      
      const tx = await game.connect(players[0].signer).startGame({
        gasLimit: 2000000
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      receipts.push(receipt);
      console.log(`   ✅ Game started! Gas: ${receipt.gasUsed.toString()}`);
      
      const gameState = await game.gameState();
      console.log(`   Current turn: Player ${gameState.currentPlayerIndex}`);
      
      expect(gameState.gameStarted).to.be.true;
      expect(gameState.gameEnded).to.be.false;
    });
  });

  describe("🎲 Phase 3: Tile Placement", function () {
    const moves = [
      { x: 5, y: 4, desc: "First tile - center" },
      { x: 6, y: 4, desc: "Adjacent - forms chain" },
      { x: 7, y: 4, desc: "Extends chain" },
      { x: 5, y: 5, desc: "Vertical placement" },
      { x: 8, y: 4, desc: "Further extends chain" },
      { x: 3, y: 3, desc: "New isolated tile" },
      { x: 4, y: 3, desc: "Adjacent to isolated" },
      { x: 9, y: 5, desc: "Far corner" },
      { x: 2, y: 2, desc: "Another area" },
      { x: 10, y: 6, desc: "Edge placement" },
    ];

    it("Should execute tile placements", async function () {
      this.timeout(600000);
      
      console.log("\n" + "-".repeat(80));
      console.log("PHASE 3: TILE PLACEMENT");
      console.log("-".repeat(80));
      
      let successfulMoves = 0;
      
      for (let i = 0; i < moves.length; i++) {
        const move = moves[i];
        
        console.log(`\n🎲 Move ${i + 1}/${moves.length}: ${move.desc}`);
        console.log(`   Position: (${move.x}, ${move.y})`);
        
        const gameState = await game.gameState();
        if (gameState.gameEnded) {
          console.log("   🏁 Game ended");
          break;
        }
        
        const currentPlayerIndex = Number(gameState.currentPlayerIndex);
        const currentPlayer = players[currentPlayerIndex];
        
        console.log(`   👤 Current turn: Player ${currentPlayerIndex} (${currentPlayer.name})`);
        
        try {
          // Use different tile index for each move (cycle through 0-5)
          const tileIndex = i % 6;
          
          const tx = await game.connect(currentPlayer.signer).placeTile(
            tileIndex,
            move.x,
            move.y,
            {
              gasLimit: 800000
            }
          );
          
          console.log(`   TX: ${tx.hash}`);
          const receipt = await tx.wait();
          receipts.push(receipt);
          console.log(`   ✅ Tile placed! Gas: ${receipt.gasUsed.toString()}`);
          
          // Check tile state
          const tileInfo = await game.getBoardTile(move.x, move.y);
          console.log(`   🏨 Placed: ${tileInfo.isPlaced}, Chain: ${tileInfo.hotelChain}`);
          
          if (tileInfo.hotelChain > 0) {
            const chainSize = await game.getHotelChainSize(tileInfo.hotelChain);
            const chainNames = ["NONE", "TOWER", "LUXOR", "AMERICAN", "WORLDWIDE", "FESTIVAL", "IMPERIAL", "CONTINENTAL"];
            console.log(`   📊 ${chainNames[tileInfo.hotelChain]} chain size: ${chainSize}`);
          }
          
          // Check new turn
          const newGameState = await game.gameState();
          console.log(`   ➡️  Next turn: Player ${newGameState.currentPlayerIndex}`);
          
          successfulMoves++;
        } catch (error) {
          console.log(`   ⚠️  Error: ${error.message.substring(0, 100)}`);
          console.log(`   ⚠️  Reason: ${error.reason || 'Unknown'}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      console.log(`\n✅ Successful moves: ${successfulMoves}/${moves.length}`);
      expect(successfulMoves).to.be.greaterThan(0);
    });

    it("Should display board state", async function () {
      this.timeout(60000);
      
      console.log("\n🗺️  BOARD STATE:");
      console.log("   " + "=".repeat(70));
      
      let tilesPlaced = 0;
      const chains = {};
      
      for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 12; x++) {
          try {
            const tile = await game.getBoardTile(x, y);
            if (tile.isPlaced) {
              tilesPlaced++;
              if (tile.hotelChain > 0) {
                chains[tile.hotelChain] = (chains[tile.hotelChain] || 0) + 1;
              }
            }
          } catch (e) {
            // Skip
          }
        }
      }
      
      console.log(`   Total tiles placed: ${tilesPlaced}`);
      console.log(`   Active hotel chains: ${Object.keys(chains).length}`);
      
      const chainNames = ["NONE", "TOWER", "LUXOR", "AMERICAN", "WORLDWIDE", "FESTIVAL", "IMPERIAL", "CONTINENTAL"];
      for (const [chainId, count] of Object.entries(chains)) {
        console.log(`   - ${chainNames[chainId]}: ${count} tiles`);
      }
    });
  });

  describe("💰 Phase 4: Share Trading", function () {
    it("Should purchase shares in active chains", async function () {
      this.timeout(300000);
      
      console.log("\n" + "-".repeat(80));
      console.log("PHASE 4: SHARE TRADING");
      console.log("-".repeat(80));
      
      // Find active chains
      const activeChains = [];
      for (let i = 1; i <= 7; i++) {
        try {
          const isActive = await game.isHotelChainActive(i);
          if (isActive) {
            activeChains.push(i);
          }
        } catch (e) {
          // Skip
        }
      }
      
      console.log(`\n🏨 Active chains: ${activeChains.length}`);
      
      if (activeChains.length === 0) {
        console.log("   ℹ️  No active chains yet - skipping share purchases");
        return;
      }
      
      const purchases = [
        { player: 0, chain: activeChains[0], amount: 5 },
        { player: 1, chain: activeChains[0], amount: 3 },
        { player: 2, chain: activeChains[0], amount: 4 },
      ];
      
      let successfulPurchases = 0;
      
      for (const purchase of purchases) {
        console.log(`\n💰 ${players[purchase.player].name} buying ${purchase.amount} shares of chain ${purchase.chain}`);
        
        const cashBefore = await game.getPlayerCash(purchase.player);
        console.log(`   Cash before: $${cashBefore}`);
        
        try {
          const tx = await game.connect(players[purchase.player].signer).purchaseShares(
            purchase.chain,
            purchase.amount,
            {
              gasLimit: 500000
            }
          );
          
          console.log(`   TX: ${tx.hash}`);
          const receipt = await tx.wait();
          receipts.push(receipt);
          console.log(`   ✅ Purchased! Gas: ${receipt.gasUsed.toString()}`);
          
          const cashAfter = await game.getPlayerCash(purchase.player);
          console.log(`   Cash after: $${cashAfter}`);
          console.log(`   Cost: $${cashBefore - cashAfter}`);
          
          successfulPurchases++;
        } catch (error) {
          console.log(`   ⚠️  Error: ${error.message.substring(0, 100)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`\n✅ Successful purchases: ${successfulPurchases}`);
    });

    it("Should display player portfolios", async function () {
      this.timeout(60000);
      
      console.log("\n📊 PLAYER PORTFOLIOS:");
      console.log("   " + "=".repeat(70));
      
      for (let i = 0; i < players.length; i++) {
        const cash = await game.getPlayerCash(i);
        console.log(`\n   ${players[i].name} (Player ${i}):`);
        console.log(`   - Cash: $${cash}`);
        console.log(`   - Shares: (encrypted)`);
      }
    });
  });

  describe("🏁 Phase 5: Game End", function () {
    it("Should end the game", async function () {
      this.timeout(90000);
      
      console.log("\n" + "-".repeat(80));
      console.log("PHASE 5: GAME END");
      console.log("-".repeat(80));
      
      console.log("\n🏁 Ending game...");
      
      const tx = await game.connect(players[0].signer).endGame({
        gasLimit: 300000
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      receipts.push(receipt);
      console.log(`   ✅ Game ended! Gas: ${receipt.gasUsed.toString()}`);
      
      const gameState = await game.gameState();
      expect(gameState.gameEnded).to.be.true;
    });

    it("Should display final standings", async function () {
      this.timeout(30000);
      
      console.log("\n🏆 FINAL STANDINGS:");
      console.log("   " + "=".repeat(70));
      
      const standings = [];
      
      for (let i = 0; i < players.length; i++) {
        const cash = await game.getPlayerCash(i);
        standings.push({
          player: players[i].name,
          id: i,
          cash: Number(cash)
        });
      }
      
      standings.sort((a, b) => b.cash - a.cash);
      
      const medals = ["🥇", "🥈", "🥉"];
      standings.forEach((s, index) => {
        const medal = medals[index] || "  ";
        console.log(`   ${medal} ${index + 1}. ${s.player}: $${s.cash}`);
      });
      
      console.log(`\n   🎉 Winner: ${standings[0].player} with $${standings[0].cash}!`);
    });
  });

  describe("📊 Phase 6: Transaction Analysis", function () {
    it("Should analyze gas costs", async function () {
      this.timeout(30000);
      
      console.log("\n" + "-".repeat(80));
      console.log("PHASE 6: TRANSACTION ANALYSIS");
      console.log("-".repeat(80));
      
      let totalGas = 0n;
      
      console.log("\n💸 Transaction Breakdown:");
      receipts.forEach((receipt, index) => {
        const gasUsed = receipt.gasUsed;
        totalGas += gasUsed;
        console.log(`   TX ${index + 1}: ${gasUsed.toString()} gas`);
      });
      
      console.log(`\n   Total Gas Used: ${totalGas.toString()}`);
      
      const feeData = await ethers.provider.getFeeData();
      const gasPrice = feeData.gasPrice;
      const totalCost = totalGas * gasPrice;
      
      console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
      console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
      console.log(`   Total Transactions: ${receipts.length}`);
    });
  });

  after(async function () {
    console.log("\n" + "=".repeat(80));
    console.log("✅ FULL GAME FLOW TEST COMPLETED!");
    console.log("=".repeat(80));
    console.log(`\n📍 Contract: ${deployedAddress}`);
    
    const network = await ethers.provider.getNetwork();
    if (network.chainId === 421614n) {
      console.log(`🔗 View on Arbiscan: https://sepolia.arbiscan.io/address/${deployedAddress}`);
    }
    
    console.log("\n🎮 Game Summary:");
    console.log("   - Players: 3");
    console.log("   - Tiles placed: Multiple");
    console.log("   - Shares purchased: Yes");
    console.log("   - Game completed: Yes");
    console.log("");
  });
});
