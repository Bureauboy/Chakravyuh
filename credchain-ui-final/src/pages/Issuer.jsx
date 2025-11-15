import React from 'react'
import axios from 'axios'
import { useConfig } from '../utils/config'

export default function Issuer() {
  const cfg = useConfig()
  const [vcText, setVcText] = React.useState('')
  const [vcHash, setVcHash] = React.useState('')
  const [canonical, setCanonical] = React.useState('')
  const [result, setResult] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function compute() {
    try {
      setBusy(true)
      setResult('Computing…')
      const resp = await axios.post(cfg.issuerApi + '/api/compute', {
        vc: JSON.parse(vcText),
      })
      setVcHash(resp.data.vcHash)
      // canonical on server is already stringified
      const canon =
        typeof resp.data.canonical === 'string'
          ? resp.data.canonical
          : JSON.stringify(resp.data.canonical, null, 2)
      setCanonical(canon)
      setResult('Computed!')
    } catch (e) {
      setResult('Error: ' + (e.response?.data?.error || e.message))
    } finally {
      setBusy(false)
    }
  }

  function loadSample() {
    setVcText(
      JSON.stringify(
        {
          '@context': ['https://www.w3.org/ns/credentials/v2'],
          type: ['VerifiableCredential', 'DegreeCredential'],
          issuer: 'did:web:university.example',
          issuanceDate: '2024-01-01T00:00:00Z',
          credentialSubject: {
            id: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
            givenName: 'Alice',
            familyName: 'Johnson',
            degree: { name: 'BSc', major: 'CS' },
            gpa: 3.9,
          },
        },
        null,
        2
      )
    )
  }

  return (
    <section>
      <div className="card">
        <div className="card-header">
          <div>
            <div className="card-title">Issuer workspace</div>
            <div className="card-subtitle">
              Paste or load a Verifiable Credential JSON, then compute its
              canonical hash.
            </div>
          </div>
          <div className="row">
            <button className="btn btn-ghost btn-sm" onClick={loadSample}>
              Load sample VC
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={compute}
              disabled={busy}
            >
              {busy ? 'Computing…' : 'Compute hash'}
            </button>
          </div>
        </div>

        <div className="section-split">
          {/* Left: VC input */}
          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              VC JSON input
            </p>
            <textarea
              className="textarea-vc"
              placeholder='Paste VC JSON here (or use "Load sample")'
              value={vcText}
              onChange={(e) => setVcText(e.target.value)}
            />
            <p className="muted-note">
              This data never leaves your local issuer server at{' '}
              <strong>{cfg.issuerApi}</strong>.
            </p>
          </div>

          {/* Right: Hash + canonical */}
          <div>
            <p className="text-muted" style={{ marginBottom: 6 }}>
              VC Hash (on-chain key)
            </p>
            <div className="pre-box">
              {vcHash || 'Hash will appear here after computing.'}
            </div>
            <p className="muted-note">
              Use this hash with the CLI script to issue the credential on the
              CredentialRegistry smart contract.
            </p>

            <p
              className="text-muted"
              style={{ marginBottom: 6, marginTop: 14 }}
            >
              Canonical JSON (stable representation)
            </p>
            <div className="pre-box">
              {canonical || 'Canonicalized VC JSON will appear here.'}
            </div>

            <p className="muted-note">
              Status: {result || 'Idle. Prepare a VC and click "Compute hash".'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
