// server.js (issuer)

// --- Imports ---
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { keccak256, toUtf8Bytes, Wallet } from "ethers";
import { parse as csvParse } from "csv-parse/sync";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
// Handle both CommonJS and ESM shapes
const pdfParse = pdfParseModule.default || pdfParseModule;

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "20mb" }));

// ---------------------------------------------------------
// Canonical JSON (stable sorted keys)
// ---------------------------------------------------------
function canonical(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(canonical);

  const out = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonical(obj[key]);
  }
  return out;
}

// ---------------------------------------------------------
// Helper: Extract VC fields from PDF text  (tweak labels for your PDF)
// ---------------------------------------------------------
function vcFromPdfText(text) {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const findLine = (...labels) => {
    const lowers = labels.map((l) => l.toLowerCase());
    const line = lines.find((l) =>
      lowers.some((lab) => l.toLowerCase().includes(lab))
    );
    if (!line) return undefined;
    const parts = line.split(":");
    return (parts[1] || parts[0]).trim();
  };

  const studentName =
    findLine("name", "student name", "candidate name") || "Unknown Student";

  const studentIdRaw =
    findLine("reg no", "registration no", "roll no", "student id") ||
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"; // fallback demo wallet

  const degreeName =
    findLine("degree", "programme", "course") || "Bachelor of Technology";

  const major =
    findLine("branch", "department", "major") || "Computer Science";

  const gpaRaw = findLine("cgpa", "gpa", "sgpa") || "0";
  const gpaMatch = gpaRaw.match(/[\d.]+/);
  const gpa = parseFloat(gpaMatch ? gpaMatch[0] : "0");

  // Build a simple VC JSON from the PDF
  return {
    "@context": ["https://www.w3.org/ns/credentials/v2"],
    type: ["VerifiableCredential", "DegreeCredential"],
    issuer: "did:web:university.example",
    issuanceDate: new Date().toISOString(),
    credentialSubject: {
      id: studentIdRaw,
      name: studentName,
      degree: {
        name: degreeName,
        major: major,
      },
      gpa,
    },
  };
}

// ---------------------------------------------------------
// 1) JSON VC → hash  (existing)
// ---------------------------------------------------------
app.post("/api/compute", (req, res) => {
  const vc = req.body.vc;
  if (!vc) return res.status(400).json({ error: "vc required" });

  const can = JSON.stringify(canonical(vc));
  const hash = keccak256(toUtf8Bytes(can));

  res.json({ vcHash: hash, canonical: can });
});

// ---------------------------------------------------------
// 2) PDF → JSON VC → hash  (PDF→JSON converter API)
// Body: { pdfBase64: "<base64-encoded PDF>" }
// ---------------------------------------------------------
app.post("/api/pdf-to-json", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64) {
      return res.status(400).json({ error: "pdfBase64 required" });
    }

    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const parsed = await pdfParse(pdfBuffer);
    const text = parsed.text || "";

    const vc = vcFromPdfText(text);
    const canonicalStr = JSON.stringify(canonical(vc));
    const hash = keccak256(toUtf8Bytes(canonicalStr));

    res.json({
      vc,                // VC JSON from PDF
      vcHash: hash,      // Hash you can issue on-chain
      canonical: canonicalStr,
      rawText: text,     // Just for debugging / demo
    });
  } catch (err) {
    console.error("PDF→JSON error:", err);
    res
      .status(500)
      .json({ error: "PDF processing failed: " + (err.message || "unknown") });
  }
});

// Optional: keep old name for compatibility if you still call /api/compute-from-pdf
app.post("/api/compute-from-pdf", async (req, res) => {
  // simply delegate to the new converter
  return app._router.handle(
    { ...req, url: "/api/pdf-to-json", method: "POST" },
    res,
    () => {}
  );
});

// ---------------------------------------------------------
// 3) Sign VC (demo-only)
// ---------------------------------------------------------
app.post("/api/sign", async (req, res) => {
  const vc = req.body.vc;
  if (!vc) return res.status(400).json({ error: "vc required" });

  const can = JSON.stringify(canonical(vc));
  const wallet = Wallet.createRandom();
  const signature = await wallet.signMessage(can);

  res.json({
    proof: {
      type: "EcdsaSecp256k1Signature2019",
      verificationMethod: "did:web:demo#key1",
      signature,
    },
    signer: wallet.address,
  });
});

// ---------------------------------------------------------
// 4) Mock IPFS pin
// ---------------------------------------------------------
app.post("/api/pin", (req, res) => {
  const data = req.body.data || "";
  const hash = keccak256(toUtf8Bytes(data || "empty"));
  const cid = "bafy" + hash.slice(2, 18);
  res.json({ cid });
});

// ---------------------------------------------------------
// 5) CSV → batch VCs (unchanged)
// ---------------------------------------------------------
app.post("/api/batch", (req, res) => {
  const csvText = req.body.csv;
  if (!csvText) return res.status(400).json({ error: "csv required" });

  const records = csvParse(csvText, { columns: true, skip_empty_lines: true });

  const results = records.map((r) => {
    const vc = {
      "@context": ["https://www.w3.org/ns/credentials/v2"],
      type: ["VerifiableCredential", "DegreeCredential"],
      issuer: "did:web:university.example",
      issuanceDate: new Date().toISOString(),
      credentialSubject: {
        id: r.address,
        givenName: r.givenName,
        familyName: r.familyName,
        degree: {
          name: r.degree,
          major: r.major,
          dateAwarded: r.dateAwarded,
        },
        gpa: parseFloat(r.gpa || "0"),
      },
    };

    const can = JSON.stringify(canonical(vc));
    const vcHash = keccak256(toUtf8Bytes(can));

    return { address: r.address, vc, vcHash };
  });

  res.json({ results });
});

// ---------------------------------------------------------
// 6) Mock SD-JWT
// ---------------------------------------------------------
app.post("/api/sd-jwt", (req, res) => {
  const payload = req.body.payload || {};
  const token = Buffer.from(JSON.stringify(payload)).toString("base64url");
  res.json({ sd_jwt: token });
});

// ---------------------------------------------------------
// Start server
// ---------------------------------------------------------
const port = process.env.PORT || 4001;
app.listen(port, () =>
  console.log("Issuer enhanced demo listening on port", port)
);
