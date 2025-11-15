import React from 'react'
import axios from 'axios'
import { useConfig } from '../utils/config'
import { ethers } from 'ethers'
import abiJson from '../abi/CredentialRegistry.json'

export default function Verifier() {
  const cfg = useConfig()
  const [fileText, setFileText] = React.useState('')
  const [vcHash, setVcHash] = React.useState('')
  const [result, setResult] = React.useState('')

  async function compute() {
    try {
      const resp = await axios.post(cfg.issuerApi + '/api/compute', {
        vc: JSON.parse(fileText)
      })
      setVcHash(resp.data.vcHash)
      setResult('Hash computed: ' + resp.data.vcHash)
    } catch (e) {
      setResult('Error: ' + e.message)
    }
  }

  async function verify() {
    try {
      const provider = new ethers.JsonRpcProvider(cfg.rpc)
      const contract = new ethers.Contract(cfg.registryAddress, abiJson.abi, provider)

      const parsed = JSON.parse(fileText)
      const student = parsed.credentialSubject.id
      const count = await contract.getCount(student)

      for (let i = 0; i < Number(count); i++) {
        const [issuer, hash, cid, ts, revoked] = await contract.getCred(student, i)

        if (hash.toLowerCase() === vcHash.toLowerCase()) {
          setResult(
            `MATCH FOUND at index ${i}
Issuer: ${issuer}
CID: ${cid}
IssuedAt: ${ts}
Revoked: ${revoked}`
          )
          return
        }
      }

      setResult('No match found')
    } catch (e) {
      setResult('Error: ' + e.message)
    }
  }

  async function onFile(e) {
    const txt = await e.target.files[0].text()
    setFileText(txt)
  }

  return (
    <div className='card'>
      <h3>Verifier</h3>
      <input type='file' accept='.json' onChange={onFile} />
      <button onClick={compute}>Compute Hash</button>
      <button onClick={verify}>Verify On-chain</button>
      <p>VC Hash: {vcHash}</p>
      <pre>{result}</pre>
    </div>
  )
}
