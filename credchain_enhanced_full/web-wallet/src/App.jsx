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
      <h1>CredChain Wallet â€” Demo</h1>
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
          <pre style={{background:'#f6f7fb', padding:12, borderRadius:8}}>{share || 'â€”'}</pre>
        </div>
      </div>
    </div>
  );
}
