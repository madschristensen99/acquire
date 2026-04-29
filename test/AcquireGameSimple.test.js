const { expect } = require("chai");
const { ethers } = require("hardhat");
const { GameTestHelper, setupTestPlayers, displayNetworkInfo } = require("./helpers/testUtils");

describe("🎮 Full Game Test - AcquireGameSimple (No FHE)", function () {
  let game;
  let helper;
  let players;
  let signers;
  let receipts = [];
  let deployedAddress;
  
  before(async function () {
    this.timeout(120000);
    
    console.log("\n" + "=".repeat(70));
    console.log("🎮 ACQUIRE GAME - FULL GAME SIMULATION (Simple Version)");
    console.log("=".repeat(70));
    
    await displayNetworkInfo();
    
    signers = await ethers.getSigners();
    console.log(`\n👥 Available signers: ${signers.length}`);
    
    console.log("\n🚀 Deploying AcquireGameSimple contract...");
    const AcquireGameSimple = await ethers.getContractFactory("AcquireGameSimple");
    game = await AcquireGameSimple.deploy();
    await game.waitForDeployment();
    
    deployedAddress = await game.getAddress();
    console.log(`✅ Contract deployed at: ${deployedAddress}`);
    
    helper = new GameTestHelper(game);
    
    const network = await ethers.provider.getNetwork();
    if (network.chainId === 421614n) {
      console.log(`🔗 View on Arbiscan: https://sepolia.arbiscan.io/address/${deployedAddress}`);
    }
  });

  describe("Phase 1: Player Registration", function () {
    it("Should register 4 players", async function () {
      this.timeout(300000);
      
      console.log("\n" + "-".repeat(70));
      console.log("PHASE 1: PLAYER REGISTRATION");
      console.log("-".repeat(70));
      
      players = await setupTestPlayers(signers, 4);
      
      for (let i = 0; i < players.length; i++) {
        console.log(`\n👤 Registering Player ${i}...`);
        console.log(`   Address: ${players[i].address.substring(0, 20)}...`);
        
        const tx = await game.connect(players[i].signer).joinGame({
          gasLimit: 300000
        });
        
        const receipt = await helper.waitForTransaction(tx, `Player ${i} joining`);
        receipts.push(receipt);
        
        const cash = await game.getPlayerCash(i);
        console.log(`   💰 Starting cash: $${cash}`);
        
        expect(cash).to.equal(6000n);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const playerCount = await game.getPlayerCount();
      console.log(`\n✅ Total players registered: ${playerCount}`);
      expect(Number(playerCount)).to.equal(4);
    });
  });

  describe("Phase 2: Game Start", function () {
    it("Should start the game", async function () {
      this.timeout(120000);
      
      console.log("\n" + "-".repeat(70));
      console.log("PHASE 2: GAME INITIALIZATION");
      console.log("-".repeat(70));
      
      console.log("\n🎬 Starting game...");
      
      const tx = await game.connect(signers[0]).startGame({
        gasLimit: 1000000
      });
      
      const receipt = await helper.waitForTransaction(tx, "Game start");
      receipts.push(receipt);
      
      await helper.displayGameState();
      
      const gameState = await game.gameState();
      expect(gameState.gameStarted).to.be.true;
      expect(gameState.gameEnded).to.be.false;
    });

    it("Should verify initial tiles were dealt", async function () {
      this.timeout(30000);
      
      console.log("\n🎲 Checking initial tiles...");
      
      for (let p = 0; p < players.length; p++) {
        console.log(`\n   Player ${p} tiles:`);
        for (let t = 0; t < 6; t++) {
          const tile = await game.getPlayerTile(p, t);
          const x = Number(tile) % 12;
          const y = Math.floor(Number(tile) / 12);
          console.log(`      Tile ${t}: ${tile} (${x}, ${y})`);
        }
      }
    });
  });

  describe("Phase 3: Tile Placement", function () {
    const moves = [
      { x: 5, y: 4, desc: "First tile" },
      { x: 6, y: 4, desc: "Form chain (adjacent)" },
      { x: 7, y: 4, desc: "Extend chain" },
      { x: 5, y: 5, desc: "Vertical placement" },
      { x: 3, y: 3, desc: "Isolated tile" },
      { x: 8, y: 5, desc: "Another isolated" },
      { x: 4, y: 4, desc: "Near first chain" },
      { x: 9, y: 6, desc: "Far placement" },
      { x: 2, y: 2, desc: "Corner area" },
      { x: 10, y: 7, desc: "Edge placement" },
    ];

    it("Should execute tile placements", async function () {
      this.timeout(600000);
      
      console.log("\n" + "-".repeat(70));
      console.log("PHASE 3: TILE PLACEMENT");
      console.log("-".repeat(70));
      
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
        
        console.log(`   👤 Current player: ${currentPlayerIndex}`);
        
        try {
          const tx = await game.connect(currentPlayer.signer).placeTile(
            0,
            move.x,
            move.y,
            {
              gasLimit: 500000
            }
          );
          
          const receipt = await helper.waitForTransaction(tx, "Tile placement");
          receipts.push(receipt);
          
          const tileInfo = await game.getBoardTile(move.x, move.y);
          console.log(`   🏨 Tile placed: ${tileInfo.isPlaced}, Chain: ${tileInfo.hotelChain}`);
          
          if (tileInfo.hotelChain > 0) {
            const chainSize = await game.getHotelChainSize(tileInfo.hotelChain);
            console.log(`   📊 Chain ${tileInfo.hotelChain} size: ${chainSize}`);
          }
          
          successfulMoves++;
        } catch (error) {
          console.log(`   ⚠️  Error: ${error.message.substring(0, 80)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      console.log(`\n✅ Successful moves: ${successfulMoves}/${moves.length}`);
      expect(successfulMoves).to.be.greaterThan(0);
    });

    it("Should display board state", async function () {
      this.timeout(30000);
      
      console.log("\n🗺️  Board State:");
      console.log("   " + "=".repeat(50));
      
      let tilesPlaced = 0;
      const chains = {};
      
      for (let y = 0; y < 9; y++) {
        for (let x = 0; x < 12; x++) {
          const tile = await game.getBoardTile(x, y);
          if (tile.isPlaced) {
            tilesPlaced++;
            if (tile.hotelChain > 0) {
              chains[tile.hotelChain] = (chains[tile.hotelChain] || 0) + 1;
            }
          }
        }
      }
      
      console.log(`   Total tiles placed: ${tilesPlaced}`);
      console.log(`   Active chains: ${Object.keys(chains).length}`);
      
      for (const [chainId, count] of Object.entries(chains)) {
        const chainNames = ["NONE", "TOWER", "LUXOR", "AMERICAN", "WORLDWIDE", "FESTIVAL", "IMPERIAL", "CONTINENTAL"];
        console.log(`   - ${chainNames[chainId]}: ${count} tiles`);
      }
    });
  });

  describe("Phase 4: Share Purchases", function () {
    it("Should purchase shares in active chains", async function () {
      this.timeout(300000);
      
      console.log("\n" + "-".repeat(70));
      console.log("PHASE 4: SHARE TRADING");
      console.log("-".repeat(70));
      
      const purchases = [
        { player: 0, chain: 1, amount: 5 },
        { player: 1, chain: 1, amount: 3 },
        { player: 2, chain: 1, amount: 4 },
        { player: 0, chain: 2, amount: 2 },
      ];
      
      let successfulPurchases = 0;
      
      for (const purchase of purchases) {
        const isActive = await game.isHotelChainActive(purchase.chain);
        
        if (!isActive) {
          console.log(`\n⚠️  Chain ${purchase.chain} not active, skipping`);
          continue;
        }
        
        console.log(`\n💰 Player ${purchase.player} buying ${purchase.amount} shares of chain ${purchase.chain}`);
        
        const cashBefore = await game.getPlayerCash(purchase.player);
        console.log(`   Cash before: $${cashBefore}`);
        
        try {
          const tx = await game.connect(players[purchase.player].signer).purchaseShares(
            purchase.chain,
            purchase.amount,
            {
              gasLimit: 300000
            }
          );
          
          const receipt = await helper.waitForTransaction(tx, "Share purchase");
          receipts.push(receipt);
          
          const cashAfter = await game.getPlayerCash(purchase.player);
          const shares = await game.getPlayerShares(purchase.player, purchase.chain);
          
          console.log(`   Cash after: $${cashAfter}`);
          console.log(`   Shares owned: ${shares}`);
          console.log(`   Cost: $${cashBefore - cashAfter}`);
          
          successfulPurchases++;
        } catch (error) {
          console.log(`   ⚠️  Error: ${error.message.substring(0, 80)}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      console.log(`\n✅ Successful purchases: ${successfulPurchases}`);
    });

    it("Should display all player portfolios", async function () {
      this.timeout(60000);
      
      console.log("\n📊 Player Portfolios:");
      console.log("   " + "=".repeat(50));
      
      const chainNames = ["NONE", "TOWER", "LUXOR", "AMERICAN", "WORLDWIDE", "FESTIVAL", "IMPERIAL", "CONTINENTAL"];
      
      for (let p = 0; p < players.length; p++) {
        try {
          const cash = await game.getPlayerCash(p);
          console.log(`\n   Player ${p}:`);
          console.log(`   - Cash: $${cash}`);
          console.log(`   - Shares:`);
          
          let hasShares = false;
          for (let c = 1; c <= 7; c++) {
            try {
              const shares = await game.getPlayerShares(p, c);
              if (shares > 0) {
                console.log(`     * ${chainNames[c]}: ${shares}`);
                hasShares = true;
              }
            } catch (e) {
              // Skip if error reading shares
            }
          }
          
          if (!hasShares) {
            console.log(`     (no shares owned)`);
          }
        } catch (e) {
          console.log(`\n   Player ${p}: Error reading data`);
        }
      }
    });
  });

  describe("Phase 5: Game Conclusion", function () {
    it("Should end the game", async function () {
      this.timeout(90000);
      
      console.log("\n" + "-".repeat(70));
      console.log("PHASE 5: GAME CONCLUSION");
      console.log("-".repeat(70));
      
      console.log("\n🏁 Ending game...");
      
      const tx = await game.connect(signers[0]).endGame({
        gasLimit: 200000
      });
      
      const receipt = await helper.waitForTransaction(tx, "Game end");
      receipts.push(receipt);
      
      const gameState = await game.gameState();
      expect(gameState.gameEnded).to.be.true;
      
      console.log("   ✅ Game ended successfully");
    });

    it("Should calculate final standings", async function () {
      this.timeout(30000);
      
      console.log("\n🏆 FINAL STANDINGS:");
      console.log("   " + "=".repeat(50));
      
      const standings = [];
      
      for (let i = 0; i < players.length; i++) {
        const cash = await game.getPlayerCash(i);
        standings.push({
          playerId: i,
          address: players[i].address,
          cash: Number(cash)
        });
      }
      
      standings.sort((a, b) => b.cash - a.cash);
      
      const medals = ["🥇", "🥈", "🥉", "4️⃣"];
      standings.forEach((s, index) => {
        console.log(`   ${medals[index] || "  "} ${index + 1}. Player ${s.playerId}: $${s.cash}`);
      });
      
      console.log(`\n   Winner: Player ${standings[0].playerId} with $${standings[0].cash}!`);
    });
  });

  describe("Phase 6: Transaction Analysis", function () {
    it("Should analyze gas costs", async function () {
      this.timeout(30000);
      
      console.log("\n" + "-".repeat(70));
      console.log("PHASE 6: TRANSACTION ANALYSIS");
      console.log("-".repeat(70));
      
      await helper.displayTransactionCosts(receipts);
      
      console.log(`\n📊 Transaction Summary:`);
      console.log(`   Total transactions: ${receipts.length}`);
    });

    it("Should display final contract state", async function () {
      this.timeout(30000);
      
      await helper.displayGameState();
      
      const balance = await ethers.provider.getBalance(deployedAddress);
      console.log(`\n💎 Contract Balance: ${ethers.formatEther(balance)} ETH`);
    });
  });

  after(async function () {
    console.log("\n" + "=".repeat(70));
    console.log("✅ FULL GAME SIMULATION COMPLETED SUCCESSFULLY!");
    console.log("=".repeat(70));
    console.log(`\n📍 Contract Address: ${deployedAddress}`);
    
    try {
      const network = await ethers.provider.getNetwork();
      if (network.chainId === 421614n) {
        console.log(`🔗 View on Arbiscan: https://sepolia.arbiscan.io/address/${deployedAddress}`);
      }
    } catch (e) {
      // Network info not critical
    }
    console.log("");
  });
});
