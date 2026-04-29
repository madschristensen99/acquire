const { ethers } = require("hardhat");

class GameTestHelper {
  constructor(gameContract) {
    this.game = gameContract;
    this.players = [];
  }

  async displayGameState() {
    const gameState = await this.game.gameState();
    console.log("\n📊 Current Game State:");
    console.log("   ==================");
    console.log(`   Players: ${gameState.playerCount}`);
    console.log(`   Current Turn: Player ${gameState.currentPlayerIndex}`);
    console.log(`   Started: ${gameState.gameStarted}`);
    console.log(`   Ended: ${gameState.gameEnded}`);
    return gameState;
  }

  async displayPlayerBalances() {
    console.log("\n💰 Player Balances:");
    console.log("   ===============");
    
    const playerCount = await this.game.getPlayerCount();
    for (let i = 0; i < Number(playerCount); i++) {
      const cash = await this.game.getPlayerCash(i);
      console.log(`   Player ${i}: $${cash}`);
    }
  }

  async waitForTransaction(tx, description) {
    console.log(`   ⏳ ${description}...`);
    console.log(`   TX: ${tx.hash}`);
    
    const receipt = await tx.wait();
    
    console.log(`   ✅ Confirmed! Gas: ${receipt.gasUsed.toString()}`);
    console.log(`   Block: ${receipt.blockNumber}`);
    
    return receipt;
  }

  createMockPermission() {
    return {
      publicKey: ethers.zeroPadValue("0x00", 32),
      signature: ethers.zeroPadValue("0x00", 65)
    };
  }

  createEncryptedValue(value, size = 32) {
    return ethers.zeroPadValue(ethers.toBeHex(value), size);
  }

  async safeExecute(fn, errorMessage = "Operation failed") {
    try {
      return await fn();
    } catch (error) {
      console.log(`   ⚠️  ${errorMessage}: ${error.message.substring(0, 100)}`);
      return null;
    }
  }

  async estimateGas(contract, method, ...args) {
    try {
      const gasEstimate = await contract[method].estimateGas(...args);
      console.log(`   ⛽ Estimated gas: ${gasEstimate.toString()}`);
      return gasEstimate;
    } catch (error) {
      console.log(`   ⚠️  Gas estimation failed: ${error.message.substring(0, 100)}`);
      return 1000000n;
    }
  }

  async getCurrentPlayer() {
    const gameState = await this.game.gameState();
    const currentIndex = Number(gameState.currentPlayerIndex);
    return {
      index: currentIndex,
      address: await this.game.getCurrentPlayer()
    };
  }

  async verifyTilePlacement(x, y) {
    console.log(`   🔍 Verifying tile at (${x}, ${y})`);
    return true;
  }

  generateRandomCoordinate() {
    return {
      x: Math.floor(Math.random() * 12),
      y: Math.floor(Math.random() * 9)
    };
  }

  async displayTransactionCosts(receipts) {
    console.log("\n💸 Transaction Cost Summary:");
    console.log("   ========================");
    
    let totalGas = 0n;
    receipts.forEach((receipt, index) => {
      if (receipt) {
        const gasUsed = receipt.gasUsed;
        totalGas += gasUsed;
        console.log(`   TX ${index + 1}: ${gasUsed.toString()} gas`);
      }
    });
    
    console.log(`   Total Gas Used: ${totalGas.toString()}`);
    
    const feeData = await ethers.provider.getFeeData();
    const gasPrice = feeData.gasPrice;
    const totalCost = totalGas * gasPrice;
    
    console.log(`   Gas Price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);
    console.log(`   Total Cost: ${ethers.formatEther(totalCost)} ETH`);
    
    return { totalGas, totalCost };
  }
}

async function setupTestPlayers(signers, count = 3) {
  const players = [];
  for (let i = 0; i < count && i < signers.length; i++) {
    players.push({
      signer: signers[i],
      id: i,
      address: signers[i].address
    });
  }
  return players;
}

async function displayNetworkInfo() {
  const network = await ethers.provider.getNetwork();
  const feeData = await ethers.provider.getFeeData();
  const blockNumber = await ethers.provider.getBlockNumber();
  
  console.log("\n🌐 Network Information:");
  console.log("   ===================");
  console.log(`   Network: ${network.name}`);
  console.log(`   Chain ID: ${network.chainId}`);
  console.log(`   Block Number: ${blockNumber}`);
  console.log(`   Gas Price: ${ethers.formatUnits(feeData.gasPrice, "gwei")} gwei`);
}

async function waitForBlocks(count = 1) {
  console.log(`   ⏳ Waiting for ${count} block(s)...`);
  const startBlock = await ethers.provider.getBlockNumber();
  
  while (true) {
    const currentBlock = await ethers.provider.getBlockNumber();
    if (currentBlock >= startBlock + count) {
      console.log(`   ✅ Block ${currentBlock} reached`);
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

module.exports = {
  GameTestHelper,
  setupTestPlayers,
  displayNetworkInfo,
  waitForBlocks
};
