const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔍 Contract Deployment Verification - Arbitrum Sepolia", function () {
  const DEPLOYED_ADDRESS = "0x075a1eB6F22390a69525363DDc1b0a372e8Be780";
  
  let game;
  let signers;
  
  before(async function () {
    this.timeout(30000);
    
    console.log("\n" + "=".repeat(70));
    console.log("🔍 ACQUIRE GAME - DEPLOYMENT VERIFICATION");
    console.log("=".repeat(70));
    
    signers = await ethers.getSigners();
    
    const AcquireGame = await ethers.getContractFactory("AcquireGame");
    game = AcquireGame.attach(DEPLOYED_ADDRESS);
    
    const network = await ethers.provider.getNetwork();
    console.log(`\n📍 Contract Address: ${DEPLOYED_ADDRESS}`);
    console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    console.log(`🔗 Explorer: https://sepolia.arbiscan.io/address/${DEPLOYED_ADDRESS}`);
  });

  describe("Contract Deployment Status", function () {
    it("Should verify contract is deployed", async function () {
      this.timeout(30000);
      
      console.log("\n📦 Checking contract deployment...");
      
      const code = await ethers.provider.getCode(DEPLOYED_ADDRESS);
      console.log(`   Contract bytecode length: ${code.length} bytes`);
      
      expect(code).to.not.equal("0x");
      expect(code.length).to.be.greaterThan(2);
      
      console.log("   ✅ Contract is deployed");
    });

    it("Should verify contract balance", async function () {
      this.timeout(30000);
      
      const balance = await ethers.provider.getBalance(DEPLOYED_ADDRESS);
      console.log(`\n💎 Contract Balance: ${ethers.formatEther(balance)} ETH`);
      
      expect(balance).to.be.a('bigint');
    });
  });

  describe("Contract State Verification", function () {
    it("Should read game state", async function () {
      this.timeout(30000);
      
      console.log("\n📊 Reading game state...");
      
      try {
        const gameState = await game.gameState();
        
        console.log("   Game State:");
        console.log(`   - Player Count: ${gameState.playerCount}`);
        console.log(`   - Current Player Index: ${gameState.currentPlayerIndex}`);
        console.log(`   - Game Started: ${gameState.gameStarted}`);
        console.log(`   - Game Ended: ${gameState.gameEnded}`);
        
        expect(gameState).to.have.property('playerCount');
        expect(gameState).to.have.property('gameStarted');
        expect(gameState).to.have.property('gameEnded');
        
        console.log("   ✅ Game state readable");
      } catch (error) {
        console.log(`   ⚠️  Error reading game state: ${error.message}`);
        throw error;
      }
    });

    it("Should read player count", async function () {
      this.timeout(30000);
      
      try {
        const playerCount = await game.getPlayerCount();
        console.log(`\n👥 Total Players: ${playerCount}`);
        
        expect(playerCount).to.be.a('bigint');
        console.log("   ✅ Player count readable");
      } catch (error) {
        console.log(`   ⚠️  Error reading player count: ${error.message}`);
        throw error;
      }
    });

    it("Should attempt to read current player", async function () {
      this.timeout(30000);
      
      try {
        const currentPlayer = await game.getCurrentPlayer();
        console.log(`\n🎯 Current Player Address: ${currentPlayer}`);
        
        expect(currentPlayer).to.be.a('string');
        console.log("   ✅ Current player readable");
      } catch (error) {
        console.log(`   ⚠️  Error reading current player: ${error.message}`);
      }
    });
  });

  describe("Network & Gas Information", function () {
    it("Should display network information", async function () {
      this.timeout(30000);
      
      console.log("\n🌐 Network Details:");
      
      const network = await ethers.provider.getNetwork();
      const blockNumber = await ethers.provider.getBlockNumber();
      const feeData = await ethers.provider.getFeeData();
      
      console.log(`   Network Name: ${network.name}`);
      console.log(`   Chain ID: ${network.chainId}`);
      console.log(`   Block Number: ${blockNumber}`);
      console.log(`   Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
      
      if (feeData.maxFeePerGas) {
        console.log(`   Max Fee Per Gas: ${ethers.formatUnits(feeData.maxFeePerGas, "gwei")} gwei`);
      }
      if (feeData.maxPriorityFeePerGas) {
        console.log(`   Max Priority Fee: ${ethers.formatUnits(feeData.maxPriorityFeePerGas, "gwei")} gwei`);
      }
      
      expect(network.chainId).to.equal(421614n);
    });

    it("Should display deployer balance", async function () {
      this.timeout(30000);
      
      console.log("\n💰 Account Balances:");
      
      for (let i = 0; i < Math.min(3, signers.length); i++) {
        const balance = await ethers.provider.getBalance(signers[i].address);
        console.log(`   Account ${i} (${signers[i].address.substring(0, 10)}...): ${ethers.formatEther(balance)} ETH`);
      }
    });
  });

  describe("⚠️  FHE Compatibility Notice", function () {
    it("Should display FHE compatibility warning", async function () {
      console.log("\n" + "⚠️ ".repeat(35));
      console.log("IMPORTANT: FHE COMPATIBILITY NOTICE");
      console.log("⚠️ ".repeat(35));
      console.log("\nThis contract uses Fhenix FHE (Fully Homomorphic Encryption) operations.");
      console.log("FHE operations require the Fhenix network to function properly.");
      console.log("\n📋 Current Status:");
      console.log("   ✓ Contract deployed on: Arbitrum Sepolia");
      console.log("   ✗ FHE operations: NOT SUPPORTED on Arbitrum Sepolia");
      console.log("\n🔧 To run a full game test with FHE:");
      console.log("   1. Deploy to Fhenix Helium testnet:");
      console.log("      npm run deploy:fhenix");
      console.log("   2. Update DEPLOYED_ADDRESS in test files");
      console.log("   3. Run tests against Fhenix network:");
      console.log("      hardhat test --network fhenix");
      console.log("\n💡 Alternative:");
      console.log("   - Create a non-FHE version of the contract for Arbitrum");
      console.log("   - Use standard Solidity types instead of euint8/ebool");
      console.log("   - Remove FHE.asEuint8(), FHE.decrypt() calls");
      console.log("\n🌐 Networks:");
      console.log("   - Fhenix Helium: https://explorer.helium.fhenix.zone");
      console.log("   - Arbitrum Sepolia: https://sepolia.arbiscan.io");
      console.log("\n" + "=".repeat(70) + "\n");
    });
  });

  after(function () {
    console.log("\n✅ Deployment verification completed!");
    console.log("=" .repeat(70) + "\n");
  });
});
