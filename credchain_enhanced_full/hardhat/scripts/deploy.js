// scripts/deploy.js
const hre = require("hardhat");

async function main() {
  console.log("Deploying CredentialRegistry...");

  const Registry = await hre.ethers.getContractFactory("CredentialRegistry");
  const registry = await Registry.deploy();
  await registry.deployed();                  // ✅ ethers v5 style

  console.log("✅ CredentialRegistry deployed at:", registry.address);

  // (optional) write address to deployed.json
  const fs = require("fs");
  fs.writeFileSync(
    "deployed.json",
    JSON.stringify({ registry: registry.address }, null, 2)
  );
  console.log("💾 Saved deployed.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
