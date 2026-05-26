import type { BlobUploadResult } from "@capsule/shared-types";
import type { StorageProvider } from "./provider.js";

interface WalrusStoreResponse {
  newlyCreated?: { blobObject: { id?: string; blobId: string } };
  alreadyCertified?: { blobId: string };
}

export class WalrusProvider implements StorageProvider {
  constructor(
    private readonly publisherUrl: string,
    private readonly aggregatorUrl: string,
    private readonly epochs: number,
    private readonly ownerAddress?: string,
    private readonly authToken?: string,
  ) {}

  async uploadBlob(data: Uint8Array): Promise<BlobUploadResult> {
    const endpoint = new URL("/v1/blobs", this.publisherUrl);
    endpoint.searchParams.set("epochs", String(this.epochs));
    endpoint.searchParams.set("permanent", "true");
    if (this.ownerAddress) {
      endpoint.searchParams.set("send_object_to", this.ownerAddress);
    }
    const headers = this.authToken ? { authorization: `Bearer ${this.authToken}` } : undefined;
    const response = await fetch(endpoint, { method: "PUT", body: data as BodyInit, headers });
    if (!response.ok) {
      throw new Error(`Walrus publisher rejected blob upload (${response.status})`);
    }
    const result = await response.json() as WalrusStoreResponse;
    const blobId = result.newlyCreated?.blobObject.blobId ?? result.alreadyCertified?.blobId;
    if (!blobId) {
      throw new Error("Walrus response did not include a blob ID");
    }
    return {
      blobId,
      suiObjectId: result.newlyCreated?.blobObject.id,
      storage: "walrus",
    };
  }

  async fetchBlob(blobId: string): Promise<Uint8Array> {
    const response = await fetch(`${this.aggregatorUrl}/v1/blobs/${encodeURIComponent(blobId)}`);
    if (!response.ok) {
      throw new Error(`Walrus aggregator could not retrieve blob (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  async deleteBlob(): Promise<void> {
    throw new Error("Permanent Walrus blobs cannot be deleted through Capsule");
  }
}
