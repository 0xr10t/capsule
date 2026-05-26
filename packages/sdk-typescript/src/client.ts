import type {
  CapsuleRecord,
  DocumentListing,
  GenerateDisclosureRequest,
  PublishDocumentRequest,
  PurchaseReceipt,
  PurchaseRequest,
  StoredCapsule,
  VerifyResult,
} from "@capsule/shared-types";

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: response.statusText })) as { error?: string };
    throw new Error(body.error ?? "Capsule request failed");
  }
  return response.json() as Promise<T>;
}

export class MarketplaceClient {
  constructor(
    readonly marketplaceUrl: string,
    readonly disclosureHostUrl: string,
  ) {}

  listDocuments(): Promise<DocumentListing[]> {
    return jsonRequest<DocumentListing[]>(`${this.marketplaceUrl}/documents`);
  }

  uploadDocument(request: PublishDocumentRequest): Promise<DocumentListing> {
    return jsonRequest<DocumentListing>(`${this.disclosureHostUrl}/documents/upload`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  purchaseDisclosure(request: PurchaseRequest): Promise<PurchaseReceipt> {
    return jsonRequest<PurchaseReceipt>(`${this.marketplaceUrl}/purchase`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  createDisclosure(request: GenerateDisclosureRequest): Promise<CapsuleRecord> {
    return jsonRequest<CapsuleRecord>(`${this.disclosureHostUrl}/disclosure/generate`, {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  fetchCapsule(blobId: string): Promise<CapsuleRecord> {
    return jsonRequest<CapsuleRecord>(`${this.disclosureHostUrl}/capsules/${encodeURIComponent(blobId)}`);
  }

  verifyDisclosure(capsule: StoredCapsule["capsule"]): Promise<VerifyResult> {
    return jsonRequest<VerifyResult>(`${this.disclosureHostUrl}/verify`, {
      method: "POST",
      body: JSON.stringify(capsule),
    });
  }
}
