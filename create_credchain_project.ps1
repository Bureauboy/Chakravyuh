# create_credchain_project.ps1
# Creates full CredChain Enhanced project and zips it (Windows PowerShell)

$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot "credchain_enhanced_full"

# Clean up old folder if exists
if (Test-Path $root) {
    Write-Host "Removing existing folder $root"
    Remove-Item -Recurse -Force -Path $root
}
New-Item -ItemType Directory -Path $root | Out-Null

function Write-File($relPath, $content) {
    $full = Join-Path $root $relPath
    $dir = Split-Path $full
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    # Use Out-File with UTF8NoBOM to preserve characters correctly
    $content | Out-File -FilePath $full -Encoding utf8
    Write-Host "Wrote" $relPath
}

# README and run notes
Write-File "README.md" @"
# CredChain — Full Enhanced Hackathon MVP

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
"@

Write-File "README_RUN.md" @"
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
"@

# Contracts
Write-File "contracts/CredentialRegistry.sol" @"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract CredentialRegistry {
    struct CredentialRef {
        address issuer;
        bytes32 vcHash;
        string cid;
        uint64 issuedAt;
        bool revoked;
    }

    mapping(address => CredentialRef[]) private creds;
    mapping(address => bool) public isIssuer;
    address public owner;

    event IssuerSet(address indexed issuer, bool enabled);
    event Issued(address indexed issuer, address indexed student, uint indexed idx, bytes32 vcHash);
    event Revoked(address indexed issuer, address indexed student, uint indexed idx, bytes32 vcHash);

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }
    modifier onlyIssuer() {
        require(isIssuer[msg.sender], "issuer only");
        _;
    }

    constructor() {
        owner = msg.sender;
        isIssuer[msg.sender] = true;
    }

    function setIssuer(address issuer, bool enabled) external onlyOwner {
        isIssuer[issuer] = enabled;
        emit IssuerSet(issuer, enabled);
    }

    function issue(address student, bytes32 vcHash, string calldata cid) external onlyIssuer {
        creds[student].push(CredentialRef({
            issuer: msg.sender,
            vcHash: vcHash,
            cid: cid,
            issuedAt: uint64(block.timestamp),
            revoked: false
        }));
        emit Issued(msg.sender, student, creds[student].length - 1, vcHash);
    }

    function revoke(address student, uint idx) external onlyIssuer {
        require(idx < creds[student].length, "index");
        CredentialRef storage c = creds[student][idx];
        require(c.issuer == msg.sender, "only issuer");
        require(!c.revoked, "already revoked");
        c.revoked = true;
        emit Revoked(msg.sender, student, idx, c.vcHash);
    }

    function getCount(address student) external view returns (uint) {
        return creds[student].length;
    }

    function getCred(address student, uint idx) external view returns (address issuer, bytes32 vcHash, string memory cid, uint64 issuedAt, bool revoked) {
        CredentialRef storage c = creds[student][idx];
        return (c.issuer, c.vcHash, c.cid, c.issuedAt, c.revoked);
    }
}
"@

Write-File "contracts/SoulboundDegree.sol" @"
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Context.sol";

contract SoulboundDegree is Context {
    string public name = "SoulboundDegree";
    string public symbol = "SBDG";
    address public issuer;
    uint256 public nextId = 1;

    mapping(uint256 => address) public ownerOf;
    mapping(address => uint256[]) public tokensOf;
    mapping(uint256 => bytes32) public vcHashOf;

    event Minted(address indexed to, uint256 indexed tokenId, bytes32 vcHash);

    modifier onlyIssuer() {
        require(_msgSender() == issuer, "only issuer");
        _;
    }

    constructor(address _issuer) {
        issuer = _issuer;
    }

    function mint(address to, bytes32 vcHash) external onlyIssuer returns (uint256) {
        uint256 id = nextId++;
        ownerOf[id] = to;
        tokensOf[to].push(id);
        vcHashOf[id] = vcHash;
        emit Minted(to, id, vcHash);
        return id;
    }
}
"@

# Hardhat project
Write-File "hardhat/package.json" @"
{
  ""name"": ""credchain-hardhat"",
  ""version"": ""1.0.0"",
  ""scripts"": {
    ""compile"": ""npx hardhat compile"",
    ""deploy:local"": ""npx hardhat run --network localhost scripts/deploy.js"",
    ""test"": ""npx hardhat test""
  },
  ""dependencies"": {
    ""hardhat"": ""^2.17.0"",
    ""@nomicfoundation/hardhat-toolbox"": ""^3.0.0"",
    ""@openzeppelin/contracts"": ""^4.9.3"",
    ""fs-extra"": ""^11.1.1""
  }
}
"@

Write-File "hardhat/hardhat.config.js" @"
require('@nomicfoundation/hardhat-toolbox');
module.exports = {
  solidity: '0.8.19',
  networks: {
    localhost: {
      url: 'http://127.0.0.1:8545'
    }
  }
};
"@

Write-File "hardhat/scripts/deploy.js" @"
// deploy.js - deploys CredentialRegistry and SoulboundDegree and writes deployed.json
const fs = require('fs');
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with', deployer.address);

  const Registry = await ethers.getContractFactory('CredentialRegistry');
  const registry = await Registry.deploy();
  await registry.deployed();
  console.log('CredentialRegistry deployed to', registry.address);

  const SBT = await ethers.getContractFactory('SoulboundDegree');
  const sbt = await SBT.deploy(deployer.address);
  await sbt.deployed();
  console.log('SoulboundDegree deployed to', sbt.address);

  const out = {
    owner: deployer.address,
    registry: registry.address,
    sbt: sbt.address
  };
  fs.writeFileSync('deployed.json', JSON.stringify(out, null, 2));
  console.log('Wrote deployed.json');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
"@

# Issuer service (enhanced)
Write-File "issuer/package.json" @"
{
  ""name"": ""credchain-issuer"",
  ""version"": ""1.0.0"",
  ""main"": ""server.js"",
  ""license"": ""MIT"",
  ""dependencies"": {
    ""express"": ""^4.18.2"",
    ""ethers"": ""^6.8.0"",
    ""body-parser"": ""^1.20.2"",
    ""cors"": ""^2.8.5"",
    ""csv-parse"": ""^5.4.1"",
    ""node-fetch"": ""^3.3.2"",
    ""form-data"": ""^4.0.0""
  }
}
"@

Write-File "issuer/server.js" @"
/**
Enhanced issuer demo:
- /api/compute : canonicalize VC => vcHash
- /api/sign : mock DID signature (demo only)
- /api/pin : IPFS pin stub (demo)
- /api/batch : accept CSV, return computed vcHashes
- /api/sd-jwt : SD-JWT stub (demo)
*/
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { keccak256, toUtf8Bytes, Wallet } = require('ethers');
const csv = require('csv-parse/lib/sync');
const fetch = require('node-fetch');

const app = express();
app.use(cors());
app.use(bodyParser.json({limit: '10mb'}));

function canonical(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(canonical);
  const keys = Object.keys(obj).sort();
  const o = {};
  for (const k of keys) o[k] = canonical(obj[k]);
  return o;
}

app.post('/api/compute', (req, res) => {
  const vc = req.body.vc;
  if(!vc) return res.status(400).send({error:'vc required'});
  const can = JSON.stringify(canonical(vc));
  const hash = keccak256(toUtf8Bytes(can));
  res.json({ vcHash: hash, canonical: can });
});

app.post('/api/sign', async (req, res) => {
  const vc = req.body.vc;
  if(!vc) return res.status(400).send({error:'vc required'});
  const can = JSON.stringify(canonical(vc));
  const wallet = Wallet.createRandom();
  const sig = await wallet.signMessage(can);
  res.json({ proof: { type: 'EcdsaSecp256k1Signature2019', verificationMethod: 'did:web:demo#key1', signature: sig }, signer: wallet.address });
});

app.post('/api/pin', (req, res) => {
  const data = req.body.data || '';
  const hash = keccak256(toUtf8Bytes(data || 'empty'));
  const cid = 'bafy' + hash.slice(2, 18);
  res.json({ cid });
});

app.post('/api/batch', (req, res) => {
  const csvText = req.body.csv;
  if(!csvText) return res.status(400).send({error:'csv required'});
  const records = csv(csvText, {columns:true, skip_empty_lines:true});
  const results = records.map(r => {
    const vc = {
      '@context':['https://www.w3.org/ns/credentials/v2'],
      'type':['VerifiableCredential','DegreeCredential'],
      'issuer':'did:web:university.example',
      'issuanceDate': new Date().toISOString(),
      'credentialSubject': {
        'id': r.address,
        'givenName': r.givenName || r.givenname || r.GivenName || r.name,
        'familyName': r.familyName || r.familyname || '',
        'degree': {'name': r.degree,'major': r.major, 'dateAwarded': r.dateAwarded},
        'gpa': parseFloat(r.gpa || '0')
      }
    };
    const can = JSON.stringify(canonical(vc));
    const hash = keccak256(toUtf8Bytes(can));
    return {address: r.address, vc, vcHash: hash};
  });
  res.json({ results });
});

app.post('/api/sd-jwt', (req, res) => {
  const payload = req.body.payload || {};
  const token = Buffer.from(JSON.stringify(payload)).toString('base64url');
  res.json({ sd_jwt: token, note: 'demo sd-jwt token' });
});

const port = process.env.PORT || 4001;
app.listen(port, () => console.log('Issuer enhanced demo listening on', port));
"@

# Scripts
Write-File "scripts/issue.js" @"
// usage: node scripts/issue.js <rpcUrl> <registryAddr> <studentAddr> <vcHash> <cid> <privateKey>
const { ethers } = require('ethers');
async function main() {
  const args = process.argv.slice(2);
  if (args.length < 6) {
    console.log('Usage: node scripts/issue.js <rpcUrl> <registryAddr> <studentAddr> <vcHash> <cid> <privateKey>');
    process.exit(1);
  }
  const [rpcUrl, registryAddr, studentAddr, vcHash, cid, pk] = args;
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const abi = ['function issue(address student, bytes32 vcHash, string calldata cid) external'];
  const registry = new ethers.Contract(registryAddr, abi, wallet);
  const tx = await registry.issue(studentAddr, vcHash, cid);
  console.log('Issued tx:', tx.hash);
  const rc = await tx.wait();
  console.log('Mined:', rc.transactionHash);
}
main().catch(console.error);
"@

Write-File "scripts/batch_issue.js" @"
// Batch issue: node scripts/batch_issue.js <rpcUrl> <registryAddr> <csvPath> <issuerApiUrl> <privateKey>
const fs = require('fs');
const fetch = require('node-fetch');
const { ethers } = require('ethers');

async function main() {
  const args = process.argv.slice(2);
  if(args.length < 5) {
    console.log('Usage: node scripts/batch_issue.js <rpcUrl> <registryAddr> <csvPath> <issuerApiUrl> <privateKey>');
    process.exit(1);
  }
  const [rpcUrl, registryAddr, csvPath, issuerApiUrl, pk] = args;
  const csv = fs.readFileSync(csvPath, 'utf8');
  const res = await fetch(issuerApiUrl + '/api/batch', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({csv})});
  const json = await res.json();
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(pk, provider);
  const abi = ['function issue(address student, bytes32 vcHash, string calldata cid) external'];
  const registry = new ethers.Contract(registryAddr, abi, wallet);
  for(const r of json.results) {
    console.log('Issuing for', r.address, 'vcHash', r.vcHash);
    const tx = await registry.issue(r.address, r.vcHash, '');
    await tx.wait();
    console.log('Issued to', r.address);
  }
  console.log('Batch issuance complete.');
}
main().catch(console.error);
"@

# Verifier
Write-File "verifier/verify.js" @"
// usage: node verifier/verify.js <rpcUrl> <registryAddr> <studentAddress> <vcJsonPath>
const fs = require('fs');
const { keccak256, toUtf8Bytes } = require('ethers').utils;
const { ethers } = require('ethers');

function canonical(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(canonical);
  const keys = Object.keys(obj).sort();
  const o = {};
  for (const k of keys) o[k] = canonical(obj[k]);
  return o;
}

async function main() {
  const args = process.argv.slice(2);
  if(args.length < 4) {
    console.log('Usage: node verifier/verify.js <rpcUrl> <registryAddr> <studentAddress> <vcJsonPath>');
    process.exit(1);
  }
  const [rpcUrl, registryAddr, studentAddr, vcPath] = args;
  const vc = JSON.parse(fs.readFileSync(vcPath));
  const can = JSON.stringify(canonical(vc));
  const hash = keccak256(toUtf8Bytes(can));
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const abi = ["function getCount(address) view returns (uint)", "function getCred(address,uint) view returns (address,bytes32,string,uint64,bool)"];
  const registry = new ethers.Contract(registryAddr, abi, provider);
  const count = await registry.getCount(studentAddr);
  for(let i=0;i<Number(count);i++){
    const [issuer, onchainHash, cid, issuedAt, revoked] = await registry.getCred(studentAddr, i);
    if(onchainHash === hash) {
      console.log('MATCH found at index', i);
      console.log({ issuer, cid, issuedAt: Number(issuedAt), revoked });
      return;
    }
  }
  console.log('No match found');
}

main().catch(console.error);
"@

# Demo files
Write-File "demo/sample_vc.json" @"
{
  ""@context"": [""https://www.w3.org/ns/credentials/v2""],
  ""type"": [""VerifiableCredential"",""DegreeCredential""],
  ""issuer"": ""did:web:university.example"",
  ""issuanceDate"": ""2025-06-15T09:00:00Z"",
  ""credentialSubject"": {
    ""id"": ""did:ethr:0x1111111111111111111111111111111111111111"",
    ""givenName"": ""Ankita"",
    ""familyName"": ""Biswas"",
    ""degree"": { ""name"": ""B.Tech CSE"", ""major"": ""Cyber Security"", ""dateAwarded"": ""2025-06-15"" },
    ""gpa"": 3.72
  },
  ""credentialSchema"": { ""id"": ""https://schemas.example/degree-v1.json"", ""type"": ""JsonSchema"" }
}
"@

Write-File "demo/demo.csv" @"
givenName,familyName,address,degree,major,dateAwarded,gpa
Ankita,Biswas,0x1111111111111111111111111111111111111111,B.Tech CSE,Cyber Security,2025-06-15,3.72
Ravi,Kumar,0x2222222222222222222222222222222222222222,MSc Data Science,AI,2024-07-01,3.85
Sara,Lee,0x3333333333333333333333333333333333333333333,BBA,Finance,2023-05-30,3.40
"@

# Web-wallet (Vite + React skeleton)
Write-File "web-wallet/package.json" @"
{
  ""name"": ""credchain-wallet"",
  ""version"": ""1.0.0"",
  ""private"": true,
  ""scripts"": {
    ""dev"": ""vite"",
    ""build"": ""vite build"",
    ""preview"": ""vite preview""
  },
  ""dependencies"": {
    ""react"": ""^18.2.0"",
    ""react-dom"": ""^18.2.0"",
    ""qr-code-styling"": ""^1.5.0""
  },
  ""devDependencies"": {
    ""vite"": ""^5.0.0""
  }
}
"@

Write-File "web-wallet/index.html" @"
<!doctype html>
<html>
  <head>
    <meta charset=""utf-8"" />
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"" />
    <title>CredChain Wallet</title>
  </head>
  <body>
    <div id=""root""></div>
    <script type=""module"" src=""/src/main.jsx""></script>
  </body>
</html>
"@

Write-File "web-wallet/src/main.jsx" @"
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';
createRoot(document.getElementById('root')).render(<App />);
"@

Write-File "web-wallet/src/App.jsx" @"
import React, {useState, useRef} from 'react';
import QRCodeStyling from 'qr-code-styling';
const qr = new QRCodeStyling({ width: 240, height: 240 });
export default function App(){
  const [vc, setVc] = useState(null);
  const [share, setShare] = useState('');
  const qrRef = useRef(null);
  function handleFile(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try{
        const json = JSON.parse(reader.result);
        setVc(json);
      }catch(err){ alert('Invalid JSON'); }
    };
    reader.readAsText(f);
  }
  function loadSample(){
    fetch('/demo/sample_vc.json').then(r=>r.json()).then(j=>setVc(j));
  }
  async function generateShare(){
    if(!vc) return alert('Load a VC first');
    const payload = { type:'VC_PRESENTATION', issuer: vc.issuer, subject: vc.credentialSubject.id, issued: vc.issuanceDate };
    const s = JSON.stringify(payload);
    setShare(s);
    if (qrRef.current) { qrRef.current.innerHTML = ''; }
    qr.update({ data: s });
    qr.append(qrRef.current);
  }
  return (
    <div style={{fontFamily:'Inter, Arial', padding:20, maxWidth:900, margin:'auto'}}>
      <h1>CredChain Wallet — Demo</h1>
      <p>Import a Verifiable Credential JSON, preview, and generate share QR.</p>
      <div style={{display:'flex', gap:20}}>
        <div style={{flex:1}}>
          <input type="file" accept=".json" onChange={handleFile} />
          <button onClick={loadSample} style={{marginLeft:8}}>Load Sample</button>
          <button onClick={generateShare} style={{marginLeft:8}}>Generate Share QR</button>
          <h3>VC Preview</h3>
          <pre style={{background:'#f6f7fb', padding:12, borderRadius:8}}>{vc? JSON.stringify(vc,null,2) : 'No VC loaded'}</pre>
        </div>
        <div style={{width:300}}>
          <h3>QR</h3>
          <div ref={qrRef} />
          <h4>Share payload</h4>
          <pre style={{background:'#f6f7fb', padding:12, borderRadius:8}}>{share || '—'}</pre>
        </div>
      </div>
    </div>
  );
}
"@

Write-File "web-wallet/src/styles.css" @"
body { background:#f7f9fc; font-family: Inter, Arial, sans-serif; }
pre { white-space: pre-wrap; }
"@

# tools/demo-runner.sh
Write-File "tools/demo-runner.sh" @"
#!/usr/bin/env bash
set -e
RPC=""http://127.0.0.1:8545""
echo ""Deploying contracts...""
cd hardhat
npm install --silent
npx hardhat run --network localhost scripts/deploy.js
cd ..
echo ""Starting issuer service...""
cd issuer
npm install --silent
node server.js & ISS_PID=$!
cd ..
sleep 2
REG=$(node -e ""console.log(require('./hardhat/deployed.json').registry)"")
echo ""Registry: $REG""
echo ""Compute VC hash...""
VCHASH=$(curl -s -X POST http://localhost:4001/api/compute -H ""Content-Type: application/json"" -d @demo/sample_vc.json | jq -r .vcHash)
echo ""vcHash=$VCHASH""
PK=""0x59c6995e998f97a5a0044976f1339d0f1e8b3f6b1b8a4b8b6f5c4d8a3d8f9e0a""
node scripts/issue.js $RPC $REG ""0x1111111111111111111111111111111111111111"" $VCHASH "" ""$PK
node verifier/verify.js $RPC $REG ""0x1111111111111111111111111111111111111111"" demo/sample_vc.json
kill $ISS_PID || true
echo ""Demo finished.""
"@

# Final: create zip
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipPath = Join-Path $PSScriptRoot "credchain_enhanced_full.zip"
if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
[System.IO.Compression.ZipFile]::CreateFromDirectory($root, $zipPath)
Write-Host "✔ Created project at $root"
Write-Host "✔ Created zip at $zipPath"
Write-Host "`nNext steps:"
Write-Host "1) Open a terminal and follow README_RUN.md inside the project folder."
Write-Host "2) If you need a one-line help to deploy locally, reply and I will paste the exact commands."
