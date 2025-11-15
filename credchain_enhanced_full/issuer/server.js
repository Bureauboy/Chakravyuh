import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import { keccak256, toUtf8Bytes, Wallet } from "ethers";
import { parse as csvParse } from "csv-parse/sync";

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));

// Canonicalize JSON deterministically
function canonical(obj) {
  if (typeof obj !== "object" || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(canonical);
  const keys = Object.keys(obj).sort();
  const out = {};
  for (const key of keys) out[key] = canonical(obj[key]);
  return out;
}


// ---------------------------------------------------------
// Compute VC hash
// ---------------------------------------------------------
app.post("/api/compute", (req, res) => {
  const vc = req.body.vc;
  if (!vc) return res.status(400).send({ error: "vc required" });

  const can = JSON.stringify(canonical(vc));
  const hash = keccak256(toUtf8Bytes(can));

  res.json({ vcHash: hash, canonical: can });
});


// ---------------------------------------------------------
// Sign VC (demo signature)
// ---------------------------------------------------------
app.post("/api/sign", async (req, res) => {
  const vc = req.body.vc;
  if (!vc) return res.status(400).send({ error: "vc required" });

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
// Pin VC to mock IPFS ? return fake CID
// ---------------------------------------------------------
app.post("/api/pin", (req, res) => {
  const data = req.body.data || "";
  const hash = keccak256(toUtf8Bytes(data || "empty"));
  const cid = "bafy" + hash.slice(2, 18);
  res.json({ cid });
});


// ---------------------------------------------------------
// Batch generator using CSV
// ---------------------------------------------------------
app.post("/api/batch", (req, res) => {
  const csvText = req.body.csv;
  if (!csvText) return res.status(400).send({ error: "csv required" });

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
// SD-JWT Demo (mock)
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
