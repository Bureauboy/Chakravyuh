// verifier/verify.js
// Usage: node verifier/verify.js <rpcUrl> <registryAddr> <studentAddr> <vcJsonFile>

const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

// Canonicalize JSON: sort all keys lexicographically
function canonicalize(obj) {
    if (Array.isArray(obj)) {
        return obj.map(canonicalize);
    } else if (obj && typeof obj === "object") {
        return Object.keys(obj)
            .sort()
            .reduce((acc, key) => {
                acc[key] = canonicalize(obj[key]);
                return acc;
            }, {});
    }
    return obj;
}

function computeVcHash(vcObj) {
    const canonicalObj = canonicalize(vcObj);
    const canonicalStr = JSON.stringify(canonicalObj);
    const bytes = ethers.toUtf8Bytes(canonicalStr);
    return ethers.keccak256(bytes);
}

async function main() {
    if (process.argv.length < 6) {
        console.log("Usage: node verifier/verify.js <rpcUrl> <registryAddr> <studentAddr> <vcJsonFile>");
        process.exit(1);
    }

    const rpcUrl      = process.argv[2];
    const registryAddr = process.argv[3];
    const studentAddr  = process.argv[4];
    const vcFile       = process.argv[5];

    const vcJson = JSON.parse(fs.readFileSync(vcFile, "utf8"));
    const vcHash = computeVcHash(vcJson);

    console.log("Computed VC Hash:", vcHash);

    // Load ABI
    const abiPath = path.join(__dirname, "..", "hardhat", "artifacts", "contracts", "CredentialRegistry.sol", "CredentialRegistry.json");
    const artifact = JSON.parse(fs.readFileSync(abiPath));
    const abi = artifact.abi;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const registry = new ethers.Contract(registryAddr, abi, provider);

    const count = await registry.getCount(studentAddr);
    console.log("Total credentials for student:", count.toString());

    // Scan through all credentials and find match
    for (let i = 0; i < count; i++) {
        const [issuer, hash, cid, issuedAt, revoked] = await registry.getCred(studentAddr, i);

        if (hash.toLowerCase() === vcHash.toLowerCase()) {
            console.log("🎉 MATCH FOUND at index", i);
            console.log("Issuer:", issuer);
            console.log("CID:", cid);
            console.log("IssuedAt:", issuedAt.toString());
            console.log("Revoked:", revoked);
            return;
        }
    }

    console.log("❌ No matching credential found.");
}

main().catch(console.error);
