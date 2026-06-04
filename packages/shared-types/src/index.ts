export type HexHash = string;
export type BlobId = string;

export interface LineRange {
  start: number;
  end: number;
}

export type PublicationMode = "host-generated" | "publisher-sealed-fragments";

export interface PublishedFragment {
  range: LineRange;
  sealIdentity: string;
  encryptedBlobId: BlobId;
  walrusBlobObjectId?: string;
  suiFragmentId?: string;
  registrationTx?: string;
}

export interface DocumentListing {
  id: string;
  title: string;
  description: string;
  publisher: string;
  category: string;
  lineCount: number;
  rootHash: HexHash;
  encryptedBlobId: BlobId;
  walrusBlobObjectId?: string;
  suiDocumentId?: string;
  documentTx?: string;
  pricePerLineMist: string;
  publicationMode?: PublicationMode;
  fragments?: PublishedFragment[];
  createdAt: string;
}

export interface PurchaseReceipt {
  id: string;
  documentId: string;
  buyer: string;
  range: LineRange;
  amountMist: string;
  paymentTx: string;
  suiPurchaseId?: string;
  suiFragmentId?: string;
  createdAt: string;
}

export interface ProofNode {
  hash: HexHash;
  position: "left" | "right";
}

export interface LineProof {
  lineIndex: number;
  leafSalt?: string;
  siblings: ProofNode[];
}

export interface MerkleRangeProof {
  algorithm: "sha256";
  leafHashing?: "plain-sha256" | "salted-sha256-v1";
  leafCount: number;
  paddedLeafCount: number;
  range: LineRange;
  proofs: LineProof[];
}

export interface DisclosureCapsule {
  version: "1";
  capsuleId: string;
  documentId: string;
  documentBlobId: BlobId;
  rootHash: HexHash;
  lineRange: LineRange;
  disclosedContent: string[];
  proof: MerkleRangeProof;
  createdAt: string;
  signature?: string;
  signerPublicKey?: string;
  paymentTx: string;
  suiPurchaseId?: string;
  buyer: string;
  publisher: string;
  suiDocumentId?: string;
  suiDisclosureId?: string;
  disclosureMode?: "host-generated" | "publisher-sealed-fragment";
}

export interface StoredCapsule {
  capsule: DisclosureCapsule;
  capsuleBlobId: BlobId;
  sealProtected?: boolean;
  walrusBlobObjectId?: string;
  suiDisclosureId?: string;
  disclosureTx?: string;
}

export interface CapsuleSummary {
  capsuleId: string;
  documentId: string;
  rootHash: HexHash;
  documentBlobId?: BlobId;
  lineRange: LineRange;
  createdAt: string;
  paymentTx: string;
  suiPurchaseId: string;
  buyer: string;
  publisher: string;
  suiDocumentId?: string;
  suiFragmentId?: string;
}

export interface SealedCapsuleEnvelope {
  version: "1";
  algorithm: "SEAL";
  packageId: string;
  identity: string;
  encryptedObject: string;
  suiPurchaseId: string;
  accessPolicy?: "paid-capsule" | "published-fragment";
  suiFragmentId?: string;
}

export interface SealedStoredCapsule {
  summary: CapsuleSummary;
  sealedCapsule: SealedCapsuleEnvelope;
  capsuleBlobId: BlobId;
  walrusBlobObjectId?: string;
  suiDisclosureId?: string;
  disclosureTx?: string;
}

export type CapsuleRecord = StoredCapsule | SealedStoredCapsule;

export type ChainEntityType = "document" | "fragment" | "purchase" | "disclosure";
export type ChainReconciliationStatus = "verified" | "mismatch" | "missing" | "error";

export interface ChainReconciliationRecord {
  entityType: ChainEntityType;
  entityId: string;
  suiObjectId: string;
  status: ChainReconciliationStatus;
  checkedAt: string;
  transactionDigest?: string;
  details?: string;
}

export interface ChainReconciliationSummary {
  checkedAt: string;
  checked: number;
  verified: number;
  failed: number;
  records: ChainReconciliationRecord[];
}

export interface PrecomputedFragmentPayload {
  version: "1";
  rootHash: HexHash;
  lineRange: LineRange;
  disclosedContent: string[];
  proof: MerkleRangeProof;
}

export interface PublisherSealedFragment {
  range: LineRange;
  envelope: Omit<SealedCapsuleEnvelope, "suiPurchaseId" | "accessPolicy" | "suiFragmentId">;
}

export interface PublishSealedDocumentRequest {
  title: string;
  description: string;
  publisher: string;
  category: string;
  pricePerLineMist: string;
  lineCount: number;
  rootHash: HexHash;
  fragments: PublisherSealedFragment[];
}

export interface PublishDocumentRequest {
  title: string;
  description: string;
  publisher: string;
  category: string;
  pricePerLineMist: string;
  content: string;
}

export interface PurchaseRequest {
  documentId: string;
  buyer: string;
  range: LineRange;
  paymentTx?: string;
  suiPurchaseId?: string;
  suiFragmentId?: string;
}

export interface GenerateDisclosureRequest {
  purchaseId: string;
}

export interface VerifyResult {
  valid: boolean;
  computedRoot: HexHash;
  expectedRoot: HexHash;
  reason?: string;
  anchored?: boolean;
  chainRoot?: HexHash;
  suiDocumentId?: string;
}

export interface BlobUploadResult {
  blobId: BlobId;
  suiObjectId?: string;
  storage: "memory" | "walrus";
}

export interface EncryptedDocumentEnvelope {
  version: "1";
  algorithm: "AES-256-GCM";
  initializationVector: string;
  ciphertext: string;
}
