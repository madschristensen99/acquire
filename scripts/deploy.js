const hre = require("hardhat");

async function main() {
  console.log("Deploying AcquireGame contract...");

  const AcquireGame = await hre.ethers.getContractFactory("AcquireGame");
  const acquireGame = await AcquireGame.deploy();

  await acquireGame.waitForDeployment();

  const address = await acquireGame.getAddress();
  console.log(`AcquireGame deployed to: ${address}`);
  
  console.log("\nContract deployment complete!");
  console.log("You can now interact with the game using this address.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
