import { createHash } from "node:crypto";
import type { BlobUploadResult } from "@capsule/shared-types";
import type { StorageProvider } from "./provider.js";

export class MemoryProvider implements StorageProvider {
  private readonly blobs = new Map<string, Uint8Array>();

  async uploadBlob(data: Uint8Array): Promise<BlobUploadResult> {
    const blobId = `memory-${createHash("sha256").update(data).digest("hex")}`;
    this.blobs.set(blobId, data);
    return { blobId, storage: "memory" };
  }

  async fetchBlob(blobId: string): Promise<Uint8Array> {
    const value = this.blobs.get(blobId);
    if (!value) {
      throw new Error("Blob not found in local demo storage");
    }
    return value;
  }

  async deleteBlob(blobId: string): Promise<void> {
    this.blobs.delete(blobId);
  }
}

