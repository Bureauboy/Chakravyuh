# CredChain â€” Full Enhanced Hackathon MVP

This scaffold contains:
- contracts/: Solidity smart contracts (CredentialRegistry + SoulboundDegree)
- hardhat/: Hardhat project (config + deploy script; writes deployed.json)
- issuer/: Node.js issuer service (VC canonicalize, DID-sign stub, IPFS stub, batch CSV, SD-JWT stub)
- scripts/: issue & batch_issue
- verifier/: verify script
- demo/: sample_vc.json and demo.csv
- web-wallet/: React (Vite) wallet skeleton (import VC, generate QR)
- tools/: demo-runner.sh

Follow README_RUN.md for step-by-step instructions.
