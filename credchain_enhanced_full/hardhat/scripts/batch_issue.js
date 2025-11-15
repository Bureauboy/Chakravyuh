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
