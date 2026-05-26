export type HexHash = string;
export type BlobId = string;

export interface LineRange {
  start: number;
  end: number;
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
  createdAt: string;
}

export interface PurchaseReceipt {
  id: string;
  documentId: string;
  buyer: string;
  range: LineRange;
  amountMist: string;
  paymentTx: string;
  createdAt: string;
}

export interface ProofNode {
  hash: HexHash;
  position: "left" | "right";
}

export interface LineProof {
  lineIndex: number;
  siblings: ProofNode[];
}

export interface MerkleRangeProof {
  algorithm: "sha256";
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
  signature: string;
  signerPublicKey: string;
  paymentTx: string;
  buyer: string;
  publisher: string;
  suiDocumentId?: string;
  suiDisclosureId?: string;
}

export interface StoredCapsule {
  capsule: DisclosureCapsule;
  capsuleBlobId: BlobId;
  walrusBlobObjectId?: string;
  suiDisclosureId?: string;
  disclosureTx?: string;
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
