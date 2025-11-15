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

  // -----------------------------
  // FILE UPLOAD HANDLER
  // -----------------------------
  async function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    setResult('Processing file…')

    // If PDF → send to server for conversion
    if (file.type === 'application/pdf') {
      try {
        const form = new FormData()
        form.append('pdf', file)

        const resp = await axios.post(
          cfg.issuerApi + '/api/pdf-to-json',
          form,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )

        const jsonVC = resp.data.vc
        setFileText(JSON.stringify(jsonVC, null, 2))
        setResult('PDF converted → JSON extracted. Now compute hash.')

      } catch (err) {
        setResult('PDF conversion failed: ' + err.message)
      }
      return
    }

    // If JSON → load normally
    try {
      const txt = await file.text()
      JSON.parse(txt) // Validate JSON
      setFileText(txt)
      setResult('JSON loaded. Click compute hash.')
    } catch (err) {
      setResult('Invalid JSON file.')
    }
  }

  // -----------------------------
  // HASH COMPUTE
  // -----------------------------
  async function compute() {
    if (!fileText) {
      setResult('Load a PDF or VC JSON first.')
      return
    }

    try {
      setBusy(true)
      setResult('Computing hash…')

      const resp = await axios.post(cfg.issuerApi + '/api/compute', {
        vc: JSON.parse(fileText),
      })

      setVcHash(resp.data.vcHash)
      setResult('Hash computed → now verify on-chain.')

    } catch (e) {
      setResult('Error: ' + (e.response?.data?.error || e.message))
    } finally {
      setBusy(false)
    }
  }

  // -----------------------------
  // ON-CHAIN VERIFICATION
  // -----------------------------
  async function verify() {
    if (!vcHash) {
      setResult('Compute the hash first.')
      return
    }

    try {
      setBusy(true)
      setResult('Checking blockchain…')

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
        const [issuer, hash, cid, ts, revoked] =
          await contract.getCred(student, i)

        if (hash.toLowerCase() === vcHash.toLowerCase()) {
          setResult(
            [
              `✅ MATCH FOUND`,
              `Index: ${i}`,
              `Issuer: ${issuer}`,
              `CID: ${cid}`,
              `IssuedAt: ${ts}`,
              `Revoked: ${revoked}`,
            ].join('\n')
          )
          found = true
          break
        }
      }

      if (!found) setResult('❌ No matching VC found on-chain.')

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
              Upload a PDF or VC JSON → convert → hash → verify on-chain.
            </div>
          </div>
        </div>

        <div className="section-stack">

          {/* File Upload */}
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="file-input-wrap">
              <div className="file-input-display">
                {fileName || 'Choose PDF or VC JSON'}
              </div>
              <input
                type="file"
                accept=".json,application/pdf"
                onChange={onFile}
              />
            </div>

            <button className="btn btn-primary" onClick={compute} disabled={busy}>
              {busy ? 'Working…' : 'Compute hash'}
            </button>

            <button className="btn btn-ghost" onClick={verify} disabled={busy}>
              Verify on-chain
            </button>
          </div>

          {/* Hash Display */}
          <div>
            <p className="text-muted">VC Hash</p>
            <div className="pre-box">
              {vcHash || 'Hash will appear here.'}
            </div>
          </div>

          {/* Result */}
          <div>
            <p className="text-muted">Verification result</p>
            <div className="pre-box">
              {result || 'Awaiting action…'}
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
