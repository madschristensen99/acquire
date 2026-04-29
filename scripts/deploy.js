const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const network = hre.network.name;
  console.log(`\n🚀 Deploying AcquireGame contract to ${network}...`);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`📝 Deploying with account: ${deployer.address}`);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${hre.ethers.formatEther(balance)} ETH`);

  const AcquireGame = await hre.ethers.getContractFactory("AcquireGameCoFHE");
  console.log("⏳ Deploying AcquireGameCoFHE contract...");
  
  const acquireGame = await AcquireGame.deploy();
  await acquireGame.waitForDeployment();

  const address = await acquireGame.getAddress();
  console.log(`\n✅ AcquireGameCoFHE deployed to: ${address}`);
  
  // Export contract info for frontend
  const contractInfo = {
    address: address,
    network: network,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString()
  };
  
  // Save contract address
  const deploymentPath = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }
  
  fs.writeFileSync(
    path.join(deploymentPath, `${network}.json`),
    JSON.stringify(contractInfo, null, 2)
  );
  
  // Export ABI for frontend
  const artifactPath = path.join(__dirname, "../artifacts/contracts/AcquireGameCoFHE.sol/AcquireGameCoFHE.json");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  
  fs.writeFileSync(
    path.join(__dirname, "../frontend/AcquireGame.abi.json"),
    JSON.stringify(artifact.abi, null, 2)
  );
  
  console.log(`\n📄 Contract info saved to: deployments/${network}.json`);
  console.log(`📄 ABI exported to: frontend/AcquireGame.abi.json`);
  
  // Network-specific explorer links
  const explorers = {
    arbitrumSepolia: `https://sepolia.arbiscan.io/address/${address}`,
    baseSepolia: `https://sepolia.basescan.org/address/${address}`,
    fhenix: `https://explorer.helium.fhenix.zone/address/${address}`,
  };
  
  if (explorers[network]) {
    console.log(`\n🔍 View on explorer: ${explorers[network]}`);
  }
  
  // Verify contract on block explorer
  if (network !== 'localhost' && network !== 'hardhat') {
    console.log("\n🔍 Verifying contract on block explorer...");
    console.log("⏳ Waiting 30 seconds for block confirmations...");
    
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      if (error.message.includes("Already Verified")) {
        console.log("✅ Contract already verified!");
      } else {
        console.log("⚠️  Verification failed:", error.message);
        console.log("💡 You can verify manually later with:");
        console.log(`   npx hardhat verify --network ${network} ${address}`);
      }
    }
  }
  
  console.log("\n✨ Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log(`1. Update frontend/app.js with contract address: ${address}`);
  console.log(`2. Update .env with CONTRACT_ADDRESS=${address}`);
  console.log(`3. Fund the contract if needed for game operations`);
  console.log(`4. Start the notification server: npm run notify`);
  console.log(`5. Start the frontend: npm run serve`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
