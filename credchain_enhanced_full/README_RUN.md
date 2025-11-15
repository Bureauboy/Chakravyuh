Run instructions:

1) Start Hardhat node:
   - cd hardhat
   - npm install
   - npx hardhat node

2) Deploy contracts:
   - In another terminal: cd hardhat
   - npx hardhat run --network localhost scripts/deploy.js
   - This writes hardhat/deployed.json

3) Start Issuer service:
   - cd issuer
   - npm install
   - node server.js

4) Issue a credential:
   - node ..\scripts\issue.js http://127.0.0.1:8545 <registryAddr> <studentAddr> <vcHash> <cid> <privateKey>

5) Verify:
   - node ..\verifier\verify.js http://127.0.0.1:8545 <registryAddr> <studentAddress> ..\demo\sample_vc.json

6) Wallet (React Vite):
   - cd web-wallet
   - npm install
   - npm run dev
