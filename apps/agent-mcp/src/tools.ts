import { MarketplaceClient, verifyCapsule } from "@capsule/sdk-typescript";
import type {
  CapsuleRecord,
  CapsuleSummary,
  DisclosureCapsule,
  DocumentListing,
  StoredCapsule,
  VerifyResult,
} from "@capsule/shared-types";

export interface AgentConfig {
  marketplaceUrl: string;
  disclosureHostUrl: string;
}

export interface AgentDocumentSummary {
  id: string;
  title: string;
  description: string;
  category: string;
  publisher: string;
  lineCount: number;
  pricePerLineMist: string;
  publicationMode: DocumentListing["publicationMode"];
  rootHash: string;
  suiDocumentId?: string;
  fragmentCount: number;
  createdAt: string;
}

export interface DocumentCommitment {
  id: string;
  title: string;
  rootHash: string;
  encryptedBlobId: string;
  walrusBlobObjectId?: string;
  suiDocumentId?: string;
  documentTx?: string;
  publisher: string;
  lineCount: number;
  pricePerLineMist: string;
  publicationMode: DocumentListing["publicationMode"];
  fragments: NonNullable<DocumentListing["fragments"]>;
}

export interface CapsuleVerification {
  mode: "verified-capsule" | "sealed-capsule";
  valid: boolean;
  local?: VerifyResult;
  host?: VerifyResult;
  requiresSealDecryption?: boolean;
  capsuleBlobId?: string;
  suiDisclosureId?: string;
  summary?: CapsuleSummary;
  reason?: string;
}

export interface CapsuleAgentClient {
  listDocuments(): Promise<DocumentListing[]>;
  fetchCapsule(blobId: string): Promise<CapsuleRecord>;
  verifyDisclosure(capsule: DisclosureCapsule): Promise<VerifyResult>;
}

export function createAgentConfig(env: NodeJS.ProcessEnv = process.env): AgentConfig {
  return {
    marketplaceUrl: env.CAPSULE_MARKETPLACE_API_URL
      ?? env.MARKETPLACE_API_URL
      ?? env.VITE_MARKETPLACE_API_URL
      ?? "http://localhost:4000",
    disclosureHostUrl: env.CAPSULE_DISCLOSURE_HOST_URL
      ?? env.DISCLOSURE_HOST_URL
      ?? env.VITE_DISCLOSURE_HOST_URL
      ?? "http://localhost:4001",
  };
}

export function createAgentClient(config = createAgentConfig()): CapsuleAgentClient {
  return new MarketplaceClient(config.marketplaceUrl, config.disclosureHostUrl);
}

function summarizeDocument(document: DocumentListing): AgentDocumentSummary {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    category: document.category,
    publisher: document.publisher,
    lineCount: document.lineCount,
    pricePerLineMist: document.pricePerLineMist,
    publicationMode: document.publicationMode,
    rootHash: document.rootHash,
    suiDocumentId: document.suiDocumentId,
    fragmentCount: document.fragments?.length ?? 0,
    createdAt: document.createdAt,
  };
}

export async function listDocuments(
  client: Pick<CapsuleAgentClient, "listDocuments">,
  input: { category?: string; limit?: number } = {},
): Promise<{ documents: AgentDocumentSummary[]; count: number }> {
  const documents = await client.listDocuments();
  const category = input.category?.trim().toLowerCase();
  const filtered = category
    ? documents.filter((document) => document.category.toLowerCase() === category)
    : documents;
  const limited = Number.isInteger(input.limit) && input.limit! > 0
    ? filtered.slice(0, input.limit)
    : filtered;
  return {
    documents: limited.map(summarizeDocument),
    count: limited.length,
  };
}

export async function getDocumentCommitment(
  client: Pick<CapsuleAgentClient, "listDocuments">,
  input: { documentId: string },
): Promise<DocumentCommitment> {
  const documents = await client.listDocuments();
  const document = documents.find((item) => item.id === input.documentId || item.suiDocumentId === input.documentId);
  if (!document) {
    throw new Error("Document commitment not found");
  }
  return {
    id: document.id,
    title: document.title,
    rootHash: document.rootHash,
    encryptedBlobId: document.encryptedBlobId,
    walrusBlobObjectId: document.walrusBlobObjectId,
    suiDocumentId: document.suiDocumentId,
    documentTx: document.documentTx,
    publisher: document.publisher,
    lineCount: document.lineCount,
    pricePerLineMist: document.pricePerLineMist,
    publicationMode: document.publicationMode,
    fragments: document.fragments ?? [],
  };
}

export async function fetchCapsule(
  client: Pick<CapsuleAgentClient, "fetchCapsule">,
  input: { capsuleBlobId: string },
): Promise<CapsuleRecord> {
  return client.fetchCapsule(input.capsuleBlobId);
}

function capsuleFromRecord(record: CapsuleRecord): DisclosureCapsule | undefined {
  return "capsule" in record ? record.capsule : undefined;
}

export async function verifyCapsuleTool(
  client: Pick<CapsuleAgentClient, "fetchCapsule" | "verifyDisclosure">,
  input: {
    capsule?: DisclosureCapsule;
    capsuleBlobId?: string;
    useHostAnchor?: boolean;
  },
): Promise<CapsuleVerification> {
  const record = input.capsuleBlobId ? await client.fetchCapsule(input.capsuleBlobId) : undefined;
  if (record && "sealedCapsule" in record) {
    return {
      mode: "sealed-capsule",
      valid: false,
      requiresSealDecryption: true,
      capsuleBlobId: record.capsuleBlobId,
      suiDisclosureId: record.suiDisclosureId,
      summary: record.summary,
      reason: "Capsule is Seal-encrypted. Decrypt it with the purchasing wallet, then pass the decrypted capsule to verify_capsule.",
    };
  }
  const capsule = input.capsule ?? (record ? capsuleFromRecord(record) : undefined);
  if (!capsule) {
    throw new Error("Provide either a plaintext capsule or a capsuleBlobId that resolves to a plaintext capsule");
  }
  const local = await verifyCapsule(capsule);
  const host = input.useHostAnchor === false ? undefined : await client.verifyDisclosure(capsule);
  return {
    mode: "verified-capsule",
    valid: host ? host.valid : local.valid,
    local,
    host,
    capsuleBlobId: record && "capsule" in record ? (record as StoredCapsule).capsuleBlobId : input.capsuleBlobId,
    suiDisclosureId: record && "suiDisclosureId" in record ? record.suiDisclosureId : capsule.suiDisclosureId,
    reason: host?.reason ?? local.reason,
  };
}

export function jsonText(data: unknown) {
  return {
    content: [{
      type: "text" as const,
      text: JSON.stringify(data, null, 2),
    }],
  };
}
