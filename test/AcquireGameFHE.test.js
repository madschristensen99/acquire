const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🎮 Acquire Game - FHE v0.5.0 Test", function () {
  let game;
  let signers;
  let deployedAddress;
  
  before(async function () {
    this.timeout(120000);
    
    console.log("\n" + "=".repeat(70));
    console.log("🎮 ACQUIRE GAME - FHE v0.5.0 TEST");
    console.log("=".repeat(70));
    
    signers = await ethers.getSigners();
    console.log(`\n👥 Available signers: ${signers.length}`);
    
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    
    console.log("\n🚀 Deploying AcquireGame contract with FHE v0.5.0...");
    const AcquireGame = await ethers.getContractFactory("AcquireGame");
    game = await AcquireGame.deploy();
    await game.waitForDeployment();
    
    deployedAddress = await game.getAddress();
    console.log(`✅ Contract deployed at: ${deployedAddress}`);
    
    if (network.chainId === 421614n) {
      console.log(`🔗 Arbiscan: https://sepolia.arbiscan.io/address/${deployedAddress}`);
    } else if (network.chainId === 8008420n) {
      console.log(`🔗 Fhenix Explorer: https://explorer.helium.fhenix.zone/address/${deployedAddress}`);
    }
  });

  describe("Phase 1: Contract Deployment", function () {
    it("Should verify contract is deployed", async function () {
      this.timeout(30000);
      
      console.log("\n📦 Verifying deployment...");
      
      const code = await ethers.provider.getCode(deployedAddress);
      expect(code).to.not.equal("0x");
      
      console.log("   ✅ Contract code verified");
    });

    it("Should read initial game state", async function () {
      this.timeout(30000);
      
      const gameState = await game.gameState();
      
      console.log("\n📊 Initial Game State:");
      console.log(`   Player Count: ${gameState.playerCount}`);
      console.log(`   Game Started: ${gameState.gameStarted}`);
      console.log(`   Game Ended: ${gameState.gameEnded}`);
      
      expect(gameState.playerCount).to.equal(0n);
      expect(gameState.gameStarted).to.be.false;
      expect(gameState.gameEnded).to.be.false;
    });
  });

  describe("Phase 2: Player Registration", function () {
    it("Should allow Player 1 to join", async function () {
      this.timeout(60000);
      
      console.log("\n👤 Player 1 joining...");
      
      const tx = await game.connect(signers[0]).joinGame({
        gasLimit: 500000
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Gas used: ${receipt.gasUsed.toString()}`);
      
      const cash = await game.getPlayerCash(0);
      console.log(`   💰 Starting cash: $${cash}`);
      
      expect(cash).to.equal(6000n);
    });

    it("Should allow Player 2 to join", async function () {
      this.timeout(60000);
      
      console.log("\n👤 Player 2 joining...");
      
      const tx = await game.connect(signers[1]).joinGame({
        gasLimit: 500000
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Gas used: ${receipt.gasUsed.toString()}`);
      
      const playerCount = await game.getPlayerCount();
      console.log(`   Total players: ${playerCount}`);
      
      expect(playerCount).to.equal(2n);
    });
  });

  describe("Phase 3: Game Start", function () {
    it("Should start the game", async function () {
      this.timeout(120000);
      
      console.log("\n🎬 Starting game...");
      
      const tx = await game.connect(signers[0]).startGame({
        gasLimit: 2000000
      });
      
      console.log(`   TX: ${tx.hash}`);
      const receipt = await tx.wait();
      console.log(`   ✅ Gas used: ${receipt.gasUsed.toString()}`);
      
      const gameState = await game.gameState();
      console.log(`   Game Started: ${gameState.gameStarted}`);
      
      expect(gameState.gameStarted).to.be.true;
    });
  });

  describe("Phase 4: Tile Placement Test", function () {
    it("Should attempt to place a tile", async function () {
      this.timeout(90000);
      
      console.log("\n🎲 Testing tile placement...");
      
      const gameState = await game.gameState();
      const currentPlayerIndex = Number(gameState.currentPlayerIndex);
      
      console.log(`   Current player: ${currentPlayerIndex}`);
      
      try {
        // Create encrypted tile index (0)
        const encryptedTileIndex = ethers.zeroPadValue("0x00", 32);
        
        const tx = await game.connect(signers[currentPlayerIndex]).placeTile(
          encryptedTileIndex,
          5,
          4,
          {
            gasLimit: 1000000
          }
        );
        
        console.log(`   TX: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Tile placed! Gas: ${receipt.gasUsed.toString()}`);
        
        expect(receipt.status).to.equal(1);
      } catch (error) {
        console.log(`   ⚠️  Error: ${error.message.substring(0, 100)}`);
        
        // On Arbitrum, FHE operations will fail
        // On Fhenix, they should work
        const network = await ethers.provider.getNetwork();
        if (network.chainId === 421614n) {
          console.log("   ℹ️  Expected on Arbitrum (no FHE support)");
        } else {
          throw error;
        }
      }
    });
  });

  describe("Phase 5: Summary", function () {
    it("Should display final state", async function () {
      this.timeout(30000);
      
      console.log("\n📊 Final Summary:");
      console.log("   =============");
      
      const gameState = await game.gameState();
      const playerCount = await game.getPlayerCount();
      
      console.log(`   Players: ${playerCount}`);
      console.log(`   Game Started: ${gameState.gameStarted}`);
      console.log(`   Game Ended: ${gameState.gameEnded}`);
      
      const network = await ethers.provider.getNetwork();
      
      console.log("\n💡 Next Steps:");
      if (network.chainId === 421614n) {
        console.log("   ⚠️  You're on Arbitrum Sepolia");
        console.log("   FHE operations require Fhenix network");
        console.log("   To test full game:");
        console.log("   1. Deploy to Fhenix: npm run deploy:fhenix");
        console.log("   2. Run test on Fhenix: hardhat test --network fhenix");
      } else {
        console.log("   ✅ You're on Fhenix - FHE operations should work!");
        console.log("   Continue testing tile placement and share purchases");
      }
    });
  });

  after(async function () {
    console.log("\n" + "=".repeat(70));
    console.log("✅ FHE v0.5.0 TEST COMPLETED");
    console.log("=".repeat(70));
    console.log(`\n📍 Contract: ${deployedAddress}`);
    
    const network = await ethers.provider.getNetwork();
    console.log(`🌐 Network: ${network.name} (${network.chainId})`);
    console.log(`📦 CoFHE SDK: v0.5.0`);
    console.log(`📦 Fhenix Contracts: v0.3.1`);
    console.log("");
  });
});
