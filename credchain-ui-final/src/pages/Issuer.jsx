import React from 'react'
import axios from 'axios'
import { useConfig } from '../utils/config'

export default function Issuer(){
  const cfg = useConfig()
  const [vcText, setVcText] = React.useState('')
  const [vcHash, setVcHash] = React.useState('')
  const [canonical, setCanonical] = React.useState('')
  const [result, setResult] = React.useState('')

  async function compute(){
    try{
      setResult('Computing...')
      const resp = await axios.post(cfg.issuerApi + '/api/compute', { vc: JSON.parse(vcText) })
      setVcHash(resp.data.vcHash)
      setCanonical(JSON.stringify(resp.data.canonical, null, 2))
      setResult('Computed!')
    }catch(e){
      setResult('Error: ' + (e.response?.data?.error || e.message))
    }
  }

  function loadSample(){
    setVcText(JSON.stringify({
      "@context":["https://www.w3.org/ns/credentials/v2"],
      "type":["VerifiableCredential","DegreeCredential"],
      "issuer":"did:web:university.example",
      "issuanceDate":"2024-01-01T00:00:00Z",
      "credentialSubject":{
        "id":"0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        "givenName":"Alice",
        "familyName":"Johnson",
        "degree":{"name":"BSc","major":"CS"},
        "gpa":3.9
      }
    }, null, 2))
  }

  return (
    <div className='card'>
      <h3>Issuer</h3>
      <textarea value={vcText} onChange={e=>setVcText(e.target.value)} placeholder='Paste VC JSON'/>
      <button onClick={compute}>Compute Hash</button>
      <button onClick={loadSample}>Load Sample</button>
      <p>VC Hash: {vcHash}</p>
      <pre>{canonical}</pre>
      <pre>{result}</pre>
    </div>
  )
}
