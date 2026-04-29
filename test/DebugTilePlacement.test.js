const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("🔍 DEBUG: Tile Placement Issue", function () {
  let game;
  let signer;
  
  before(async function () {
    this.timeout(120000);
    
    console.log("\n" + "=".repeat(70));
    console.log("🔍 DEBUGGING TILE PLACEMENT");
    console.log("=".repeat(70));
    
    [signer] = await ethers.getSigners();
    console.log(`\n👤 Signer: ${signer.address}`);
    
    // Deploy
    console.log("\n🚀 Deploying contract...");
    const AcquireGame = await ethers.getContractFactory("AcquireGameCoFHE");
    game = await AcquireGame.deploy();
    await game.waitForDeployment();
    
    const address = await game.getAddress();
    console.log(`✅ Deployed at: ${address}`);
  });

  it("Should complete full game flow step by step", async function () {
    this.timeout(300000);
    
    // Step 1: Join 3 players
    console.log("\n📋 Step 1: Joining players...");
    for (let i = 0; i < 3; i++) {
      const tx = await game.connect(signer).joinGame({ gasLimit: 800000 });
      await tx.wait();
      console.log(`   Player ${i} joined`);
      await new Promise(r => setTimeout(r, 2000));
    }
    
    const playerCount = await game.getPlayerCount();
    console.log(`✅ ${playerCount} players joined`);
    
    // Step 2: Start game
    console.log("\n🎬 Step 2: Starting game...");
    const startTx = await game.connect(signer).startGame({ gasLimit: 2000000 });
    await startTx.wait();
    console.log("✅ Game started");
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Step 3: Check game state
    console.log("\n📊 Step 3: Checking game state...");
    const gameState = await game.gameState();
    console.log(`   Players: ${gameState.playerCount}`);
    console.log(`   Started: ${gameState.gameStarted}`);
    console.log(`   Current turn: ${gameState.currentPlayerIndex}`);
    
    // Step 4: Place first tile
    console.log("\n🎲 Step 4: Placing first tile...");
    console.log(`   Position: (5, 4)`);
    console.log(`   Tile index: 0`);
    
    try {
      const placeTx = await game.connect(signer).placeTile(0, 5, 4, { gasLimit: 800000 });
      const receipt = await placeTx.wait();
      console.log(`✅ Tile placed! Gas: ${receipt.gasUsed.toString()}`);
      
      await new Promise(r => setTimeout(r, 3000));
      
      // Check tile
      const tile = await game.getBoardTile(5, 4);
      console.log(`   Tile placed: ${tile.isPlaced}`);
      console.log(`   Chain: ${tile.hotelChain}`);
      
      // Check turn
      const newState = await game.gameState();
      console.log(`   New turn: ${newState.currentPlayerIndex}`);
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
      
      // Try to get more details
      console.log("\n🔍 Debugging info:");
      const state = await game.gameState();
      console.log(`   Game started: ${state.gameStarted}`);
      console.log(`   Game ended: ${state.gameEnded}`);
      console.log(`   Current player: ${state.currentPlayerIndex}`);
      
      const currentPlayer = await game.getCurrentPlayer();
      console.log(`   Current player address: ${currentPlayer}`);
      console.log(`   Signer address: ${signer.address}`);
      console.log(`   Addresses match: ${currentPlayer.toLowerCase() === signer.address.toLowerCase()}`);
      
      throw error;
    }
    
    // Step 5: Place second tile
    console.log("\n🎲 Step 5: Placing second tile...");
    console.log(`   Position: (6, 4)`);
    console.log(`   Tile index: 1`);
    
    const state2 = await game.gameState();
    console.log(`   Current turn before: ${state2.currentPlayerIndex}`);
    
    try {
      const placeTx2 = await game.connect(signer).placeTile(1, 6, 4, { gasLimit: 800000 });
      const receipt2 = await placeTx2.wait();
      console.log(`✅ Second tile placed! Gas: ${receipt2.gasUsed.toString()}`);
      
      const tile2 = await game.getBoardTile(6, 4);
      console.log(`   Tile placed: ${tile2.isPlaced}`);
      console.log(`   Chain: ${tile2.hotelChain}`);
      
      const newState2 = await game.gameState();
      console.log(`   New turn: ${newState2.currentPlayerIndex}`);
      
    } catch (error) {
      console.log(`❌ Error on second tile: ${error.message}`);
      
      const state = await game.gameState();
      console.log(`   Current turn: ${state.currentPlayerIndex}`);
      const currentPlayer = await game.getCurrentPlayer();
      console.log(`   Current player: ${currentPlayer}`);
      console.log(`   Signer: ${signer.address}`);
      
      throw error;
    }
    
    console.log("\n✅ Test completed successfully!");
  });
});
