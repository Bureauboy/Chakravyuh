// scripts/issue.js
// Usage: node scripts/issue.js <rpcUrl> <registryAddr> <studentAddr> <vcHash> <cid> <privateKey>

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

async function main() {
    if (process.argv.length < 8) {
        console.log("Usage: node scripts/issue.js <rpcUrl> <registryAddr> <studentAddr> <vcHash> <cid> <privateKey>");
        process.exit(1);
    }

    const rpcUrl      = process.argv[2];
    const registryAddr = process.argv[3];
    const studentAddr  = process.argv[4];
    const vcHash       = process.argv[5];
    const cid          = process.argv[6];
    const privateKey   = process.argv[7];

    // Correct ABI path
    const abiPath = path.join(__dirname, "..", "artifacts", "contracts", "CredentialRegistry.sol", "CredentialRegistry.json");
    const artifact = JSON.parse(fs.readFileSync(abiPath, "utf8"));
    const abi = artifact.abi;

    console.log("Connecting:", rpcUrl);
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    console.log("Using wallet:", privateKey.slice(0, 12) + "…");
    const wallet = new ethers.Wallet(privateKey, provider);

    console.log("Connecting to registry:", registryAddr);
    const registry = new ethers.Contract(registryAddr, abi, wallet);

    console.log("Issuing credential…");
    const tx = await registry.issue(studentAddr, vcHash, cid);

    console.log("Tx sent:", tx.hash);
    const receipt = await tx.wait();

    console.log("Credential issued in block:", receipt.blockNumber);
}

main().catch((err) => {
    console.error("ERROR:", err);
});
