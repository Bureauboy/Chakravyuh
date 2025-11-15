import React from 'react'
import axios from 'axios'
import { useConfig } from '../utils/config'
import { ethers } from 'ethers'
import abiJson from '../abi/CredentialRegistry.json'

export default function Verifier() {
  const cfg = useConfig()
  const [fileName, setFileName] = React.useState('')
  const [fileText, setFileText] = React.useState('')
  const [vcHash, setVcHash] = React.useState('')
  const [result, setResult] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function onFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    const txt = await f.text()
    setFileText(txt)
    setResult('File loaded. Compute hash to continue.')
  }

  async function compute() {
    if (!fileText) {
      setResult('Please load a VC JSON file first.')
      return
    }
    try {
      setBusy(true)
      setResult('Computing hash…')
      const resp = await axios.post(cfg.issuerApi + '/api/compute', {
        vc: JSON.parse(fileText),
      })
      setVcHash(resp.data.vcHash)
      setResult('Hash computed. You can now verify on-chain.')
    } catch (e) {
      setResult('Error: ' + (e.response?.data?.error || e.message))
    } finally {
      setBusy(false)
    }
  }

  async function verify() {
    if (!vcHash) {
      setResult('Compute the VC hash first.')
      return
    }
    try {
      setBusy(true)
      setResult('Querying blockchain…')

      const provider = new ethers.JsonRpcProvider(cfg.rpc)
      const contract = new ethers.Contract(
        cfg.registryAddress,
        abiJson.abi,
        provider
      )

      const parsed = JSON.parse(fileText)
      const student = parsed.credentialSubject.id
      const count = await contract.getCount(student)

      let found = false
      for (let i = 0; i < Number(count); i++) {
        const [issuer, hash, cid, ts, revoked] = await contract.getCred(
          student,
          i
        )

        if (hash.toLowerCase() === vcHash.toLowerCase()) {
          setResult(
            [
              `✅ MATCH FOUND (index ${i})`,
              `Issuer: ${issuer}`,
              `CID: ${cid || '(none)'}`,
              `IssuedAt: ${ts}`,
              `Revoked: ${revoked}`,
            ].join('\n')
          )
          found = true
          break
        }
      }

      if (!found) {
        setResult('No matching credential found on-chain for this VC hash.')
      }
    } catch (e) {
      setResult('Error: ' + e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Verifier</div>
            <div className="card-subtitle">
              Upload a VC JSON, compute its hash, and check if it exists in the
              registry.
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="file-input-wrap">
              <div className="file-input-display">
                {fileName || 'Choose VC JSON file'}
              </div>
              <input type="file" accept=".json" onChange={onFile} />
            </div>

            <button
              className="btn btn-primary"
              onClick={compute}
              disabled={busy}
            >
              {busy ? 'Working…' : 'Compute hash'}
            </button>

            <button className="btn btn-ghost" onClick={verify} disabled={busy}>
              Verify on-chain
            </button>
          </div>

          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              VC Hash
            </p>
            <div className="pre-box">
              {vcHash || 'VC hash will appear here after computing.'}
            </div>
          </div>

          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              Verification result
            </p>
            <div className="pre-box">
              {result || 'No verification attempted yet.'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
