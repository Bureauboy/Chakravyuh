import React from 'react'
import { ethers } from 'ethers'
import { useConfig } from '../utils/config'
import abiJson from '../abi/CredentialRegistry.json'

export default function Wallet() {
  const cfg = useConfig()
  const [address, setAddress] = React.useState(
    '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
  )
  const [creds, setCreds] = React.useState([])
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState('')

  async function loadCreds() {
    try {
      setBusy(true)
      setError('')
      setCreds([])

      const provider = new ethers.JsonRpcProvider(cfg.rpc)
      const contract = new ethers.Contract(
        cfg.registryAddress,
        abiJson.abi,
        provider
      )

      const count = await contract.getCount(address)
      const items = []

      for (let i = 0; i < Number(count); i++) {
        const [issuer, hash, cid, ts, revoked] = await contract.getCred(
          address,
          i
        )
        items.push({ issuer, hash, cid, ts, revoked })
      }

      setCreds(items)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Wallet view</div>
            <div className="card-subtitle">
              Inspect all credentials stored on-chain for a given wallet /
              student address.
            </div>
          </div>
        </div>

        <div className="section-stack">
          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              Student / wallet address
            </p>
            <input
              type="text"
              className="input-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
            <p className="muted-note">
              Tip: for the local Hardhat demo, use Account #0 from the node
              output (Alice).
            </p>
          </div>

          <div className="row">
            <button
              className="btn btn-primary"
              onClick={loadCreds}
              disabled={busy}
            >
              {busy ? 'Loading…' : 'Load credentials'}
            </button>
          </div>

          {error && (
            <div className="pre-box" style={{ borderColor: '#fecaca' }}>
              Error: {error}
            </div>
          )}

          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              On-chain credentials
            </p>

            {creds.length === 0 && !busy && !error && (
              <div className="pre-box">No credentials found for this address.</div>
            )}

            {creds.length > 0 && (
              <div className="section-stack">
                {creds.map((c, idx) => (
                  <div key={idx} className="pre-box">
                    <div>Index: {idx}</div>
                    <div>Issuer: {c.issuer}</div>
                    <div>Hash: {c.hash}</div>
                    <div>CID: {c.cid || '(none)'}</div>
                    <div>IssuedAt: {c.ts.toString()}</div>
                    <div>Revoked: {c.revoked.toString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
