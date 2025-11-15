// src/pages/Issuer.jsx
import React from "react";
import axios from "axios";
import { useConfig } from "../utils/config";

export default function Issuer() {
  const cfg = useConfig();
  const [vcText, setVcText] = React.useState("");
  const [vcHash, setVcHash] = React.useState("");
  const [canonical, setCanonical] = React.useState("");
  const [status, setStatus] = React.useState("Idle");
  const [busy, setBusy] = React.useState(false);
  const fileRef = React.useRef();

  async function loadSample() {
    // keep simple embedded sample; you may fetch a local sample file instead
    const sample = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "DegreeCredential"],
      issuer: "did:web:university.example",
      issuanceDate: "2024-01-01T00:00:00Z",
      credentialSubject: {
        id: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
        givenName: "Alice",
        familyName: "Johnson",
        degree: { name: "BSc", major: "CS" },
        gpa: 3.9,
      },
    };
    setVcText(JSON.stringify(sample, null, 2));
    setVcHash("");
    setCanonical("");
    setStatus("Sample loaded. Compute hash when ready.");
  }

  // file input handler supports .json and .pdf
  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    setStatus("File selected: " + f.name);
    setVcHash("");
    setCanonical("");

    // If JSON, just read text
    if (f.type === "application/json" || f.name.toLowerCase().endsWith(".json")) {
      const txt = await f.text();
      setVcText(txt);
      setStatus("JSON file loaded. Click Compute hash.");
      return;
    }

    // If PDF, read as base64 and call server's compute-from-pdf
    if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
      setBusy(true);
      setStatus("Processing PDF (uploading to server)...");
      try {
        // read file as base64
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onerror = () => reject(new Error("FileReader failed"));
          reader.onload = () => {
            const result = reader.result;
            // result is "data:application/pdf;base64,...."
            const parts = result.split(",");
            resolve(parts.length > 1 ? parts[1] : parts[0]);
          };
          reader.readAsDataURL(f);
        });

        // POST to server endpoint
        const resp = await axios.post(cfg.issuerApi + "/api/compute-from-pdf", {
          pdfBase64: base64,
        }, { timeout: 60000 });

        // server returns { vc, vcHash, canonical, rawText }
        const { vc, vcHash: hash, canonical: can } = resp.data;

        setVcText(JSON.stringify(vc, null, 2));
        setVcHash(hash);
        setCanonical(typeof can === "string" ? can : JSON.stringify(can, null, 2));
        setStatus("Computed from PDF. VC JSON populated.");
      } catch (err) {
        console.error("PDF processing error:", err);
        setStatus("Error processing PDF: " + (err.response?.data?.error || err.message));
      } finally {
        setBusy(false);
      }
      return;
    }

    // other file types: attempt to read text
    try {
      const txt = await f.text();
      setVcText(txt);
      setStatus("File loaded (treated as text). Click Compute hash.");
    } catch (e) {
      setStatus("Cannot read file: " + e.message);
    }
  }

  // Use existing server compute for JSON input
  async function computeFromJson() {
    if (!vcText || !vcText.trim()) {
      setStatus("Please paste VC JSON or upload a file first.");
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(vcText);
    } catch (e) {
      setStatus("Invalid JSON: " + e.message);
      return;
    }

    setBusy(true);
    setStatus("Computing hash...");
    try {
      const resp = await axios.post(cfg.issuerApi + "/api/compute", { vc: parsed });
      const { vcHash: hash, canonical: can } = resp.data;
      setVcHash(hash);
      setCanonical(typeof can === "string" ? can : JSON.stringify(can, null, 2));
      setStatus("Computed!");
    } catch (err) {
      console.error("Compute error:", err);
      setStatus("Compute error: " + (err.response?.data?.error || err.message));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <div className="card">
        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="card-title">Issuer Workspace</div>
            <div className="card-subtitle">Upload PDF / JSON or paste VC manually.</div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-ghost" onClick={loadSample}>Load sample VC</button>
            <button className="btn btn-primary" onClick={computeFromJson} disabled={busy}>
              {busy ? "Working…" : "Compute hash"}
            </button>
          </div>
        </div>

        <div className="section-split">
          <div>
            <p className="text-muted">Upload PDF or paste VC JSON</p>
            <div style={{ marginBottom: 8 }}>
              <label className="file-input-wrap">
                <span className="file-input-display">{ /* name placeholder */ }</span>
                <input type="file" accept=".json,.pdf,application/json,application/pdf" onChange={onFile} ref={fileRef} />
              </label>
            </div>

            <textarea
              value={vcText}
              onChange={(e) => setVcText(e.target.value)}
              placeholder="Paste VC JSON or upload PDF"
              rows={18}
              style={{ width: "100%", padding: 12, fontFamily: "monospace", fontSize: 13 }}
            />
          </div>

          <div>
            <p className="text-muted">VC Hash</p>
            <div className="pre-box">{vcHash || "Not computed yet."}</div>

            <p className="text-muted" style={{ marginTop: 12 }}>Canonical JSON</p>
            <div className="pre-box">{canonical || "Canonical form will appear here."}</div>

            <p className="muted-note" style={{ marginTop: 12 }}>Status: {status}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
