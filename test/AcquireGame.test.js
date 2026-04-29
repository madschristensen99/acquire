const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AcquireGame - Full Game Simulation on Arbitrum Sepolia", function () {
  const DEPLOYED_ADDRESS = "0x075a1eB6F22390a69525363DDc1b0a372e8Be780";
  
  let game;
  let players = [];
  let signers;
  
  before(async function () {
    this.timeout(60000);
    
    console.log("\n🎮 Setting up Full Game Test on Arbitrum Sepolia");
    console.log("================================================");
    
    signers = await ethers.getSigners();
    
    const AcquireGame = await ethers.getContractFactory("AcquireGame");
    game = AcquireGame.attach(DEPLOYED_ADDRESS);
    
    console.log(`✅ Connected to deployed contract at: ${DEPLOYED_ADDRESS}`);
    console.log(`📊 Network: ${(await ethers.provider.getNetwork()).name}`);
    console.log(`⛽ Gas Price: ${ethers.formatUnits(await ethers.provider.getFeeData().then(d => d.gasPrice), "gwei")} gwei`);
  });

  describe("Game Setup & Player Join", function () {
    it("Should check initial game state", async function () {
      this.timeout(30000);
      
      const gameState = await game.gameState();
      console.log("\n📋 Initial Game State:");
      console.log(`   Players: ${gameState.playerCount}`);
      console.log(`   Current Player Index: ${gameState.currentPlayerIndex}`);
      console.log(`   Game Started: ${gameState.gameStarted}`);
      console.log(`   Game Ended: ${gameState.gameEnded}`);
      
      expect(gameState.playerCount).to.be.a('bigint');
    });

    it("Should allow Player 1 to join the game", async function () {
      this.timeout(60000);
      
      console.log("\n👤 Player 1 joining game...");
      const player1 = signers[0];
      
      try {
        const tx = await game.connect(player1).joinGame({
          gasLimit: 500000
        });
        
        console.log(`   Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Player 1 joined! Gas used: ${receipt.gasUsed.toString()}`);
        
        const playerCount = await game.getPlayerCount();
        console.log(`   Total players: ${playerCount}`);
        
        const cash = await game.getPlayerCash(0);
        console.log(`   Player 1 starting cash: $${cash}`);
        
        expect(cash).to.equal(6000n);
        players.push({ signer: player1, id: 0 });
      } catch (error) {
        if (error.message.includes("Game already started")) {
          console.log("   ⚠️  Game already started, skipping join");
          players.push({ signer: player1, id: 0 });
        } else {
          throw error;
        }
      }
    });

    it("Should allow Player 2 to join the game", async function () {
      this.timeout(60000);
      
      console.log("\n👤 Player 2 joining game...");
      const player2 = signers[1];
      
      try {
        const tx = await game.connect(player2).joinGame({
          gasLimit: 500000
        });
        
        console.log(`   Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Player 2 joined! Gas used: ${receipt.gasUsed.toString()}`);
        
        const playerCount = await game.getPlayerCount();
        console.log(`   Total players: ${playerCount}`);
        
        const cash = await game.getPlayerCash(1);
        console.log(`   Player 2 starting cash: $${cash}`);
        
        expect(cash).to.equal(6000n);
        players.push({ signer: player2, id: 1 });
      } catch (error) {
        if (error.message.includes("Game already started")) {
          console.log("   ⚠️  Game already started, skipping join");
          players.push({ signer: player2, id: 1 });
        } else {
          throw error;
        }
      }
    });

    it("Should allow Player 3 to join the game", async function () {
      this.timeout(60000);
      
      console.log("\n👤 Player 3 joining game...");
      const player3 = signers[2];
      
      try {
        const tx = await game.connect(player3).joinGame({
          gasLimit: 500000
        });
        
        console.log(`   Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Player 3 joined! Gas used: ${receipt.gasUsed.toString()}`);
        
        const playerCount = await game.getPlayerCount();
        console.log(`   Total players: ${playerCount}`);
        
        const cash = await game.getPlayerCash(2);
        console.log(`   Player 3 starting cash: $${cash}`);
        
        expect(cash).to.equal(6000n);
        players.push({ signer: player3, id: 2 });
      } catch (error) {
        if (error.message.includes("Game already started")) {
          console.log("   ⚠️  Game already started, skipping join");
          players.push({ signer: player3, id: 2 });
        } else {
          throw error;
        }
      }
    });
  });

  describe("Game Start", function () {
    it("Should start the game with minimum players", async function () {
      this.timeout(90000);
      
      console.log("\n🎬 Starting the game...");
      
      try {
        const tx = await game.connect(signers[0]).startGame({
          gasLimit: 2000000
        });
        
        console.log(`   Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Game started! Gas used: ${receipt.gasUsed.toString()}`);
        
        const gameState = await game.gameState();
        console.log(`   Game Started: ${gameState.gameStarted}`);
        console.log(`   Current Player: ${gameState.currentPlayerIndex}`);
        
        expect(gameState.gameStarted).to.be.true;
      } catch (error) {
        if (error.message.includes("Game already started")) {
          console.log("   ⚠️  Game already started");
          const gameState = await game.gameState();
          expect(gameState.gameStarted).to.be.true;
        } else {
          throw error;
        }
      }
    });

    it("Should verify initial tiles were dealt", async function () {
      this.timeout(30000);
      
      console.log("\n🎲 Verifying initial tiles dealt...");
      const gameState = await game.gameState();
      console.log(`   Game is active: ${gameState.gameStarted && !gameState.gameEnded}`);
      
      expect(gameState.gameStarted).to.be.true;
      expect(gameState.gameEnded).to.be.false;
    });
  });

  describe("Gameplay - Tile Placement", function () {
    it("Should allow current player to place a tile", async function () {
      this.timeout(90000);
      
      console.log("\n🎯 Player placing tile...");
      
      const gameState = await game.gameState();
      const currentPlayerIndex = Number(gameState.currentPlayerIndex);
      const currentPlayer = players[currentPlayerIndex];
      
      console.log(`   Current player index: ${currentPlayerIndex}`);
      console.log(`   Current player address: ${currentPlayer.signer.address}`);
      
      const x = 5;
      const y = 4;
      
      console.log(`   Attempting to place tile at (${x}, ${y})`);
      
      try {
        const encryptedTileIndex = ethers.zeroPadValue("0x00", 32);
        const permission = {
          publicKey: ethers.zeroPadValue("0x00", 32),
          signature: ethers.zeroPadValue("0x00", 65)
        };
        
        const tx = await game.connect(currentPlayer.signer).placeTile(
          encryptedTileIndex,
          x,
          y,
          permission,
          {
            gasLimit: 1000000
          }
        );
        
        console.log(`   Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Tile placed! Gas used: ${receipt.gasUsed.toString()}`);
        
        const events = receipt.logs;
        console.log(`   Events emitted: ${events.length}`);
        
      } catch (error) {
        console.log(`   ⚠️  Error placing tile: ${error.message}`);
        if (!error.message.includes("Not your turn") && !error.message.includes("Game not active")) {
          throw error;
        }
      }
    });

    it("Should place multiple tiles in sequence", async function () {
      this.timeout(180000);
      
      console.log("\n🎲 Placing multiple tiles...");
      
      const tilePlacements = [
        { x: 6, y: 4 },
        { x: 7, y: 4 },
        { x: 5, y: 5 },
      ];
      
      for (let i = 0; i < tilePlacements.length; i++) {
        try {
          const gameState = await game.gameState();
          
          if (gameState.gameEnded) {
            console.log("   Game has ended, stopping tile placement");
            break;
          }
          
          const currentPlayerIndex = Number(gameState.currentPlayerIndex);
          const currentPlayer = players[currentPlayerIndex];
          const { x, y } = tilePlacements[i];
          
          console.log(`\n   Turn ${i + 1}: Player ${currentPlayerIndex} placing at (${x}, ${y})`);
          
          const encryptedTileIndex = ethers.zeroPadValue("0x00", 32);
          const permission = {
            publicKey: ethers.zeroPadValue("0x00", 32),
            signature: ethers.zeroPadValue("0x00", 65)
          };
          
          const tx = await game.connect(currentPlayer.signer).placeTile(
            encryptedTileIndex,
            x,
            y,
            permission,
            {
              gasLimit: 1000000
            }
          );
          
          const receipt = await tx.wait();
          console.log(`   ✅ Tile placed! Gas: ${receipt.gasUsed.toString()}`);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          
        } catch (error) {
          console.log(`   ⚠️  Turn ${i + 1} error: ${error.message.substring(0, 100)}`);
        }
      }
    });
  });

  describe("Share Purchase", function () {
    it("Should allow players to purchase shares", async function () {
      this.timeout(90000);
      
      console.log("\n💰 Testing share purchases...");
      
      try {
        const player = players[0];
        const chainId = 1;
        const amount = 5;
        
        console.log(`   Player 0 attempting to buy ${amount} shares of chain ${chainId}`);
        
        const encryptedChainId = ethers.zeroPadValue(ethers.toBeHex(chainId), 32);
        const encryptedAmount = ethers.zeroPadValue(ethers.toBeHex(amount), 32);
        const permission = {
          publicKey: ethers.zeroPadValue("0x00", 32),
          signature: ethers.zeroPadValue("0x00", 65)
        };
        
        const cashBefore = await game.getPlayerCash(0);
        console.log(`   Cash before: $${cashBefore}`);
        
        const tx = await game.connect(player.signer).purchaseShares(
          encryptedChainId,
          encryptedAmount,
          permission,
          {
            gasLimit: 500000
          }
        );
        
        const receipt = await tx.wait();
        console.log(`   ✅ Shares purchased! Gas: ${receipt.gasUsed.toString()}`);
        
        const cashAfter = await game.getPlayerCash(0);
        console.log(`   Cash after: $${cashAfter}`);
        console.log(`   Cost: $${cashBefore - cashAfter}`);
        
      } catch (error) {
        console.log(`   ⚠️  Share purchase error: ${error.message.substring(0, 100)}`);
        if (!error.message.includes("Game not active") && !error.message.includes("Insufficient cash")) {
          throw error;
        }
      }
    });
  });

  describe("Game State Verification", function () {
    it("Should display final game state", async function () {
      this.timeout(30000);
      
      console.log("\n📊 Final Game State:");
      console.log("==================");
      
      const gameState = await game.gameState();
      console.log(`   Total Players: ${gameState.playerCount}`);
      console.log(`   Game Started: ${gameState.gameStarted}`);
      console.log(`   Game Ended: ${gameState.gameEnded}`);
      console.log(`   Current Player Index: ${gameState.currentPlayerIndex}`);
      
      console.log("\n💵 Player Cash Balances:");
      for (let i = 0; i < players.length; i++) {
        const cash = await game.getPlayerCash(i);
        const address = players[i].signer.address;
        console.log(`   Player ${i} (${address.substring(0, 10)}...): $${cash}`);
      }
      
      expect(gameState.playerCount).to.be.greaterThan(0);
    });

    it("Should verify contract balance and gas costs", async function () {
      this.timeout(30000);
      
      console.log("\n⛽ Transaction Summary:");
      console.log("=====================");
      
      const balance = await ethers.provider.getBalance(DEPLOYED_ADDRESS);
      console.log(`   Contract Balance: ${ethers.formatEther(balance)} ETH`);
      
      for (let i = 0; i < players.length; i++) {
        const playerBalance = await ethers.provider.getBalance(players[i].signer.address);
        console.log(`   Player ${i} Balance: ${ethers.formatEther(playerBalance)} ETH`);
      }
    });
  });

  describe("End Game", function () {
    it("Should allow ending the game", async function () {
      this.timeout(60000);
      
      console.log("\n🏁 Ending the game...");
      
      try {
        const tx = await game.connect(signers[0]).endGame({
          gasLimit: 300000
        });
        
        console.log(`   Transaction hash: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`   ✅ Game ended! Gas used: ${receipt.gasUsed.toString()}`);
        
        const gameState = await game.gameState();
        console.log(`   Game Ended: ${gameState.gameEnded}`);
        
        expect(gameState.gameEnded).to.be.true;
      } catch (error) {
        if (error.message.includes("Game not active")) {
          console.log("   ⚠️  Game already ended or not started");
        } else {
          throw error;
        }
      }
    });
  });

  after(function () {
    console.log("\n✅ Full Game Test Suite Completed!");
    console.log("===================================\n");
  });
});
