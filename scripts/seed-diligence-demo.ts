import { SealClient } from "@mysten/seal";
import { SuiJsonRpcClient, getJsonRpcFullnodeUrl } from "@mysten/sui/jsonRpc";
import dotenv from "dotenv";
import { buildMerkleTree, generateRangeProof, splitLines } from "../packages/sdk-typescript/src/index.js";
import type { PrecomputedFragmentPayload, PublisherSealedFragment } from "../packages/shared-types/src/index.js";

dotenv.config();

const disclosureHostUrl = process.env.CAPSULE_DISCLOSURE_HOST_URL
  ?? process.env.VITE_DISCLOSURE_HOST_URL
  ?? "http://localhost:4001";
const marketplaceUrl = process.env.CAPSULE_MARKETPLACE_API_URL
  ?? process.env.VITE_MARKETPLACE_API_URL
  ?? "http://localhost:4000";
const packageId = process.env.VITE_CAPSULE_PACKAGE_ID ?? process.env.SUI_PACKAGE_ID;
const threshold = Number(process.env.VITE_SEAL_THRESHOLD ?? process.env.SEAL_THRESHOLD ?? 1);
const keyServerObjectId = process.env.VITE_SEAL_KEY_SERVER_OBJECT_ID
  ?? process.env.SEAL_KEY_SERVER_OBJECT_ID
  ?? "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";
const aggregatorUrl = process.env.VITE_SEAL_AGGREGATOR_URL
  ?? process.env.SEAL_AGGREGATOR_URL
  ?? "https://seal-aggregator-testnet.mystenlabs.com";

interface DemoListing {
  title: string;
  description: string;
  publisher: string;
  category: string;
  pricePerLineMist: string;
  lines: string[];
}

const demoListings: DemoListing[] = [
  {
    title: "Supplier Risk Report — Battery Supply Chain",
    description: "Synthetic premium supplier-risk memo for AI agents evaluating EV battery supply resilience.",
    publisher: "Atlas Research Desk",
    category: "Supplier intelligence",
    pricePerLineMist: "1000000",
    lines: [
      "Title: Supplier Risk Report — Battery Supply Chain",
      "Prepared for: AI-assisted procurement and diligence workflows",
      "Report date: 2026-06-05",
      "Executive summary: Three upstream suppliers control 68% of audited cathode precursor volume.",
      "Dataset scope: synthetic purchase orders, shipment logs, and vendor scorecards over 18 months.",
      "Section: concentration risk",
      "Primary exposure: Hunan Ridge Materials supplies 37% of nickel-rich precursor inputs.",
      "Hunan Ridge missed two delivery windows after regional grid curtailments.",
      "A 21-day outage would reduce finished-cell output by an estimated 14%.",
      "Mitigation: qualify a secondary precursor supplier before Q4 sourcing lock.",
      "Section: logistics risk",
      "Port dwell time rose from 4.8 days to 8.1 days during the latest shipping cycle.",
      "Inbound customs inspections increased for electrolyte additives from two suppliers.",
      "Mitigation: pre-clear high-value inputs and diversify inbound routing.",
      "Section: margin exposure",
      "A 7% lithium carbonate price increase compresses modeled gross margin by 210 basis points.",
      "Only 42% of customer contracts include quarterly raw-material pass-through language.",
      "Mitigation: prioritize renegotiation for contracts renewing before September.",
      "Section: conclusion",
      "The supply chain is investable if dual-sourcing and price pass-through remediation are completed.",
      "Recommended buyer question: request evidence of supplier qualification milestones.",
    ],
  },
  {
    title: "Private Crypto Protocol Diligence Report",
    description: "Synthetic protocol diligence memo with selectively sellable risk sections for analysts and AI agents.",
    publisher: "Blockscope Research",
    category: "Crypto diligence",
    pricePerLineMist: "1250000",
    lines: [
      "Title: Private Crypto Protocol Diligence Report",
      "Prepared for: treasury, ecosystem, and fund diligence workflows",
      "Report date: 2026-06-05",
      "Executive summary: Protocol revenue is growing, but validator concentration and upgrade controls remain key risks.",
      "Dataset scope: public chain activity, synthetic partner interviews, and simulated governance review.",
      "Section: validator and operator risk",
      "The top five operators account for 61% of effective validation weight.",
      "Two operators share the same cloud region and backup provider.",
      "A coordinated regional outage could delay finality beyond modeled risk tolerance.",
      "Mitigation: incentivize geographically independent operators in the next delegation cycle.",
      "Section: upgrade control",
      "Emergency upgrade authority currently rests with a four-of-seven multisig.",
      "Two signers are employees of the same infrastructure vendor.",
      "Mitigation: rotate one signer to an independent security council before mainnet expansion.",
      "Section: liquidity and revenue",
      "Protocol fees increased 19% month over month in the synthetic observation period.",
      "Liquidity depth remains thin outside the top two trading pairs.",
      "Mitigation: require liquidity incentive cliffs rather than open-ended emissions.",
      "Section: conclusion",
      "The protocol is promising but not yet governance-neutral.",
      "Recommended buyer question: request multisig rotation and operator-diversification evidence.",
    ],
  },
  {
    title: "AI Model Evaluation Dataset Notes",
    description: "Synthetic evaluation notes for agents buying verified slices of model-quality evidence.",
    publisher: "EvalForge Labs",
    category: "AI evaluation",
    pricePerLineMist: "900000",
    lines: [
      "Title: AI Model Evaluation Dataset Notes",
      "Prepared for: model-risk, RAG quality, and dataset procurement workflows",
      "Report date: 2026-06-05",
      "Executive summary: The evaluated model performs well on retrieval grounding but underperforms on temporal precision.",
      "Dataset scope: synthetic benchmark prompts, rubric notes, and failure annotations.",
      "Section: retrieval grounding",
      "The model cited the supplied context in 91% of answerable cases.",
      "Citation span quality degraded when source passages exceeded 1,200 tokens.",
      "Mitigation: chunk long context into smaller claim-level evidence blocks.",
      "Section: temporal reliability",
      "The model confused fiscal year and calendar year references in 17% of tested prompts.",
      "Relative date phrasing caused the highest failure rate.",
      "Mitigation: normalize all benchmark prompts to absolute dates before scoring.",
      "Section: safety and refusal behavior",
      "The model refused 96% of clearly disallowed synthetic requests.",
      "Borderline policy prompts showed inconsistent explanation quality.",
      "Mitigation: add evaluation slices for refusal rationale consistency.",
      "Section: conclusion",
      "The model is suitable for low-risk retrieval tasks after date-normalization controls.",
      "Recommended buyer question: request failure clusters for temporal and citation tasks.",
    ],
  },
  {
    title: "Market Intelligence: India EV Components",
    description: "Synthetic market-intelligence report with purchasable slices for strategy teams and AI research agents.",
    publisher: "Indus Mobility Intelligence",
    category: "Market intelligence",
    pricePerLineMist: "1100000",
    lines: [
      "Title: Market Intelligence: India EV Components",
      "Prepared for: growth, sourcing, and market-entry workflows",
      "Report date: 2026-06-05",
      "Executive summary: Localized controller and thermal-management suppliers are becoming the primary bottleneck.",
      "Dataset scope: synthetic distributor checks, tender notes, and supplier interviews.",
      "Section: demand signal",
      "Two-wheeler EV controller demand grew fastest in tier-two city fleet deployments.",
      "Fleet operators prioritized controller reliability over upfront cost in recent tenders.",
      "Mitigation: target suppliers with field-failure rates below 1.8%.",
      "Section: supplier landscape",
      "Five component vendors appear in 73% of reviewed synthetic procurement shortlists.",
      "Thermal-management vendors remain fragmented with limited quality certification depth.",
      "Mitigation: build a certification-screened vendor map before entering new states.",
      "Section: pricing pressure",
      "Controller ASP declined 6% while warranty reserves increased for lower-tier vendors.",
      "Battery casing prices remained stable due to aluminum input hedging.",
      "Mitigation: avoid vendors competing mainly on controller price compression.",
      "Section: conclusion",
      "The best market wedge is verified reliability data rather than generic component availability.",
      "Recommended buyer question: request vendor failure-rate evidence by state and vehicle class.",
    ],
  },
  {
    title: "Legal Case Research Memo — Public demo synthetic",
    description: "Synthetic legal-research memo showing permissioned selective disclosure without using real client data.",
    publisher: "Civic Research Demo",
    category: "Legal research",
    pricePerLineMist: "800000",
    lines: [
      "Title: Legal Case Research Memo — Public demo synthetic",
      "Prepared for: permissioned document-disclosure demonstration only",
      "Report date: 2026-06-05",
      "Executive summary: This synthetic memo illustrates selective disclosure of legal research without client-confidential facts.",
      "Dataset scope: fictional procedural history, public-law themes, and synthetic issue notes.",
      "Section: procedural posture",
      "The fictional plaintiff seeks review of an administrative denial issued after a delayed hearing.",
      "The fictional record contains three agency notices and one amended evidence submission.",
      "Mitigation: disclose only procedural lines needed by the buyer's research task.",
      "Section: issue framing",
      "The central synthetic issue is whether notice timing affected opportunity to respond.",
      "The memo separates public legal reasoning from fictional client-sensitive facts.",
      "Mitigation: use fragment-level licensing terms for downstream citation.",
      "Section: research notes",
      "The strongest analogy involves timing defects cured by later meaningful review.",
      "The weakest analogy involves harmless-error findings after full evidentiary hearings.",
      "Mitigation: require buyer-side verification before ingesting into a legal RAG index.",
      "Section: conclusion",
      "Capsule can prove that a disclosed excerpt came from the committed memo.",
      "It does not certify legal correctness, attorney-client privilege, or production compliance.",
    ],
  },
];

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

async function existingTitles(): Promise<Set<string>> {
  const documents = await fetch(`${marketplaceUrl}/documents`)
    .then((response) => response.ok ? response.json() : [])
    .catch(() => []) as Array<{ title?: string }>;
  return new Set(
    documents
      .map((document) => document.title)
      .filter((title): title is string => typeof title === "string" && title.length > 0),
  );
}

async function seedListing(listing: DemoListing, sealClient: SealClient): Promise<unknown> {
  const lines = splitLines(listing.lines.join("\n"));
  const tree = await buildMerkleTree(lines, { salted: true });
  if (!tree.leafSalts || !tree.documentNonce) {
    throw new Error("Salted tree did not produce leaf salts and document nonce");
  }

  const fragmentSize = Number(process.env.SEED_FRAGMENT_SIZE ?? 5);
  const fragments: PublisherSealedFragment[] = [];
  console.log(`Preparing "${listing.title}" as ${Math.ceil(lines.length / fragmentSize)} Seal-encrypted fragments`);
  for (let start = 0; start < lines.length; start += fragmentSize) {
    const end = Math.min(lines.length - 1, start + fragmentSize - 1);
    console.log(`Encrypting "${listing.title}" lines ${start + 1}-${end + 1}`);
    fragments.push(await sealFragment({
      version: "1",
      rootHash: tree.rootHash,
      lineRange: { start, end },
      disclosedContent: lines.slice(start, end + 1),
      proof: await generateRangeProof(lines, start, end, {
        leafSalts: tree.leafSalts,
        documentNonce: tree.documentNonce,
      }),
    }, sealClient));
  }

  const response = await fetch(`${disclosureHostUrl}/documents/upload-sealed-fragments`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: listing.title,
      description: listing.description,
      publisher: listing.publisher,
      category: listing.category,
      pricePerLineMist: listing.pricePerLineMist,
      lineCount: lines.length,
      rootHash: tree.rootHash,
      fragments,
    }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.error ?? `Seed request failed with ${response.status}`);
  }
  return body;
}

async function main(): Promise<void> {
  const titles = await existingTitles();
  const suiClient = new SuiJsonRpcClient({
    network: "testnet",
    url: process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl("testnet"),
  });
  const sealClient = new SealClient({
    suiClient,
    serverConfigs: [{ objectId: keyServerObjectId, aggregatorUrl, weight: 1 }],
    verifyKeyServers: false,
  });

  const results = [];
  for (const listing of demoListings) {
    if (titles.has(listing.title)) {
      console.log(`Skipping existing demo listing: ${listing.title}`);
      results.push({ title: listing.title, skipped: true });
      continue;
    }
    results.push({ title: listing.title, result: await seedListing(listing, sealClient) });
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
