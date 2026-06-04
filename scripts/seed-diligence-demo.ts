import { SealClient } from "@mysten/seal";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import dotenv from "dotenv";
import { buildMerkleTree, generateRangeProof, splitLines } from "../packages/sdk-typescript/src/index.js";
import type { PrecomputedFragmentPayload, PublisherSealedFragment } from "../packages/shared-types/src/index.js";

dotenv.config();

const disclosureHostUrl = process.env.CAPSULE_DISCLOSURE_HOST_URL
  ?? process.env.VITE_DISCLOSURE_HOST_URL
  ?? "http://localhost:4001";
const packageId = process.env.VITE_CAPSULE_PACKAGE_ID ?? process.env.SUI_PACKAGE_ID;
const threshold = Number(process.env.VITE_SEAL_THRESHOLD ?? process.env.SEAL_THRESHOLD ?? 1);
const keyServerObjectId = process.env.VITE_SEAL_KEY_SERVER_OBJECT_ID
  ?? process.env.SEAL_KEY_SERVER_OBJECT_ID
  ?? "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";
const aggregatorUrl = process.env.VITE_SEAL_AGGREGATOR_URL
  ?? process.env.SEAL_AGGREGATOR_URL
  ?? "https://seal-aggregator-testnet.mystenlabs.com";

const report = [
  "Title: Northstar Components Supplier Concentration Diligence",
  "Prepared for: AI-assisted private-market diligence workflows",
  "Report date: 2026-06-04",
  "Executive summary: Northstar Components depends on three suppliers for 71% of mission-critical inputs.",
  "Dataset scope: 18 months of purchase orders, late-shipment logs, and audited vendor scorecards.",
  "Section: supplier concentration risks",
  "Primary risk: Supplier Atlas Foundry controls 42% of high-temperature casing volume.",
  "Atlas Foundry has missed two of the last seven quarterly delivery SLAs.",
  "A 30-day Atlas outage would delay Northstar's Q3 launch plan by an estimated 19 days.",
  "Mitigation: qualify a second foundry for SKUs HF-118, HF-119, and HF-122 before September.",
  "Section: margin sensitivity",
  "Gross margin falls 280 basis points if titanium input prices rise by 9%.",
  "The company has no pass-through clause for 46% of current enterprise contracts.",
  "Mitigation: renegotiate index-linked pricing for renewals starting in July.",
  "Section: customer concentration",
  "The top two customers represent 54% of trailing twelve-month revenue.",
  "Customer A has a renewal option that can reduce committed volume by 18% without penalty.",
  "Mitigation: expand mid-market pipeline before FY2027 planning closes.",
  "Section: regulatory and compliance",
  "No open export-control enforcement action was identified in the reviewed records.",
  "Two supplier certificates expire within 120 days and require manual renewal tracking.",
  "Mitigation: add certificate expiry alerts to procurement operations.",
  "Section: diligence conclusion",
  "The acquisition case remains viable if supplier dual-sourcing is completed before closing.",
  "Recommended buyer question: request evidence of second-source qualification progress.",
].join("\n");
const title = "Northstar Components Supplier Concentration Diligence";

function randomIdentity(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

async function sealFragment(
  payload: PrecomputedFragmentPayload,
  sealClient: SealClient,
): Promise<PublisherSealedFragment> {
  if (!packageId) {
    throw new Error("Set SUI_PACKAGE_ID or VITE_CAPSULE_PACKAGE_ID before seeding");
  }
  const identity = randomIdentity();
  const { encryptedObject } = await sealClient.encrypt({
    threshold,
    packageId,
    id: identity,
    data: new TextEncoder().encode(JSON.stringify(payload)),
  });
  return {
    range: payload.lineRange,
    envelope: {
      version: "1",
      algorithm: "SEAL",
      packageId,
      identity,
      encryptedObject: toBase64(encryptedObject),
    },
  };
}

async function main(): Promise<void> {
  const existing = await fetch(`${process.env.CAPSULE_MARKETPLACE_API_URL ?? process.env.VITE_MARKETPLACE_API_URL ?? "http://localhost:4000"}/documents`)
    .then((response) => response.ok ? response.json() : [])
    .catch(() => []) as Array<{ title?: string; id?: string; suiDocumentId?: string }>;
  const match = existing.find((document) => document.title === title);
  if (match) {
    console.log(JSON.stringify({
      skipped: true,
      reason: "Demo diligence listing already exists",
      id: match.id,
      suiDocumentId: match.suiDocumentId,
    }, null, 2));
    return;
  }

  const lines = splitLines(report);
  const tree = await buildMerkleTree(lines, { salted: true });
  if (!tree.leafSalts) {
    throw new Error("Salted tree did not produce leaf salts");
  }

  const suiClient = new SuiJsonRpcClient({
    network: "testnet",
    url: process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl("testnet"),
  });
  const sealClient = new SealClient({
    suiClient,
    serverConfigs: [{ objectId: keyServerObjectId, aggregatorUrl, weight: 1 }],
    verifyKeyServers: false,
  });

  const fragmentSize = Number(process.env.SEED_FRAGMENT_SIZE ?? 5);
  const fragments: PublisherSealedFragment[] = [];
  console.log(`Preparing ${lines.length} report lines as ${Math.ceil(lines.length / fragmentSize)} Seal-encrypted fragments`);
  for (let start = 0; start < lines.length; start += fragmentSize) {
    const end = Math.min(lines.length - 1, start + fragmentSize - 1);
    console.log(`Encrypting lines ${start + 1}-${end + 1}`);
    fragments.push(await sealFragment({
      version: "1",
      rootHash: tree.rootHash,
      lineRange: { start, end },
      disclosedContent: lines.slice(start, end + 1),
      proof: await generateRangeProof(lines, start, end, { leafSalts: tree.leafSalts }),
    }, sealClient));
  }

  console.log(`Uploading ${fragments.length} fragments through ${disclosureHostUrl}`);
  const response = await fetch(`${disclosureHostUrl}/documents/upload-sealed-fragments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title,
      description: "Premium private-market diligence report with verifiable supplier-risk sections for AI agents and analysts.",
      publisher: "Northstar Research Desk",
      category: "Due diligence",
      pricePerLineMist: "1000000",
      lineCount: lines.length,
      rootHash: tree.rootHash,
      fragments,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Seed request failed with ${response.status}`);
  }
  console.log(JSON.stringify(body, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
