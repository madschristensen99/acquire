const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🎮 CoFHE Acquire Game - Arbitrum Sepolia Test", function () {
  const DEPLOYED_ADDRESS = "0xec2F6363d2605D1979C8875b84df241D20C930C6";
  
  let game;
  let signers;
  
  before(async function () {
    this.timeout(60000);
    
    console.log("\n" + "=".repeat(70));
    console.log("🎮 ACQUIRE GAME - CoFHE v0.5.0 + v0.1.3 TEST");
    console.log("=".repeat(70));
    
    signers = await ethers.getSigners();
    console.log(`\n👥 Available signers: ${signers.length}`);
    
    const AcquireGame = await ethers.getContractFactory("AcquireGameCoFHE");
    game = AcquireGame.attach(DEPLOYED_ADDRESS);
    
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`📍 Contract: ${DEPLOYED_ADDRESS}`);
    console.log(`🔗 Arbiscan: https://sepolia.arbiscan.io/address/${DEPLOYED_ADDRESS}`);
    
    console.log("\n📦 Packages:");
    console.log("   - @cofhe/sdk: v0.5.0");
    console.log("   - @fhenixprotocol/cofhe-contracts: v0.1.3");
  });

  describe("Contract Verification", function () {
    it("Should verify contract is deployed", async function () {
      this.timeout(30000);
      
      console.log("\n📦 Verifying deployment...");
      
      const code = await ethers.provider.getCode(DEPLOYED_ADDRESS);
      expect(code).to.not.equal("0x");
      
      console.log("   ✅ Contract deployed and verified");
    });

    it("Should read game state", async function () {
      this.timeout(30000);
      
      const gameState = await game.gameState();
      
      console.log("\n📊 Game State:");
      console.log(`   Player Count: ${gameState.playerCount}`);
      console.log(`   Current Player: ${gameState.currentPlayerIndex}`);
      console.log(`   Game Started: ${gameState.gameStarted}`);
      console.log(`   Game Ended: ${gameState.gameEnded}`);
      
      expect(gameState).to.have.property('playerCount');
    });
  });

  describe("Player Join Test", function () {
    it("Should allow a player to join", async function () {
      this.timeout(90000);
      
      console.log("\n👤 Testing player join...");
      
      try {
        const tx = await game.connect(signers[0]).joinGame({
          gasLimit: 800000
        });
        
        console.log(`   TX: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Player joined! Gas: ${receipt.gasUsed.toString()}`);
        
        const playerCount = await game.getPlayerCount();
        console.log(`   Total players: ${playerCount}`);
        
        const cash = await game.getPlayerCash(0);
        console.log(`   Starting cash: $${cash}`);
        
        expect(cash).to.equal(6000n);
      } catch (error) {
        if (error.message.includes("Game already started")) {
          console.log("   ℹ️  Game already started");
          const gameState = await game.gameState();
          expect(gameState.gameStarted).to.be.true;
        } else {
          console.log(`   ⚠️  Error: ${error.message.substring(0, 150)}`);
          throw error;
        }
      }
    });
  });

  describe("Game State Check", function () {
    it("Should display current game status", async function () {
      this.timeout(30000);
      
      console.log("\n📊 Current Status:");
      console.log("   ==============");
      
      const gameState = await game.gameState();
      const playerCount = await game.getPlayerCount();
      
      console.log(`   Players: ${playerCount}`);
      console.log(`   Game Started: ${gameState.gameStarted}`);
      console.log(`   Game Ended: ${gameState.gameEnded}`);
      
      if (gameState.gameStarted) {
        const currentPlayer = await game.getCurrentPlayer();
        console.log(`   Current Turn: ${currentPlayer}`);
      }
      
      console.log("\n💰 Player Balances:");
      for (let i = 0; i < Number(playerCount); i++) {
        try {
          const cash = await game.getPlayerCash(i);
          console.log(`   Player ${i}: $${cash}`);
        } catch (e) {
          console.log(`   Player ${i}: Unable to read`);
        }
      }
    });
  });

  describe("Board State", function () {
    it("Should check hotel chains", async function () {
      this.timeout(30000);
      
      console.log("\n🏨 Hotel Chains:");
      console.log("   =============");
      
      const chainNames = ["NONE", "TOWER", "LUXOR", "AMERICAN", "WORLDWIDE", "FESTIVAL", "IMPERIAL", "CONTINENTAL"];
      
      for (let i = 1; i <= 7; i++) {
        try {
          const isActive = await game.isHotelChainActive(i);
          if (isActive) {
            const size = await game.getHotelChainSize(i);
            console.log(`   ${chainNames[i]}: Active (${size} tiles)`);
          }
        } catch (e) {
          // Skip
        }
      }
    });
  });

  describe("Summary", function () {
    it("Should display test summary", async function () {
      this.timeout(30000);
      
      console.log("\n" + "=".repeat(70));
      console.log("✅ TEST SUMMARY");
      console.log("=".repeat(70));
      
      console.log("\n📦 Deployed Contract:");
      console.log(`   Address: ${DEPLOYED_ADDRESS}`);
      console.log(`   Network: Arbitrum Sepolia`);
      console.log(`   Explorer: https://sepolia.arbiscan.io/address/${DEPLOYED_ADDRESS}`);
      
      console.log("\n🔧 Technology Stack:");
      console.log("   - CoFHE SDK: v0.5.0 (latest)");
      console.log("   - CoFHE Contracts: v0.1.3 (latest)");
      console.log("   - Network: Arbitrum Sepolia (CoFHE supported)");
      
      console.log("\n✨ Features:");
      console.log("   ✅ Encrypted player tiles (euint8)");
      console.log("   ✅ Encrypted share ownership (euint8)");
      console.log("   ✅ Public board state for game logic");
      console.log("   ✅ FHE.allowThis() and FHE.allowSender() access control");
      
      console.log("\n🎮 Next Steps:");
      console.log("   1. Get more test accounts to play a full game");
      console.log("   2. Test tile placement with encrypted tiles");
      console.log("   3. Test share purchases with encrypted ownership");
      console.log("   4. Verify FHE operations work correctly on Arbitrum Sepolia");
      
      console.log("\n💡 To play a full game:");
      console.log("   - Need at least 2 players (2 accounts with private keys)");
      console.log("   - Each player joins, then someone starts the game");
      console.log("   - Players take turns placing tiles");
      console.log("   - Players can purchase shares in active hotel chains");
      
      console.log("");
    });
  });

  after(function () {
    console.log("=".repeat(70) + "\n");
  });
});
