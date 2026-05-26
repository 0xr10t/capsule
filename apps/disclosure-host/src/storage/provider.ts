import type { BlobUploadResult } from "@capsule/shared-types";

export interface StorageProvider {
  uploadBlob(data: Uint8Array): Promise<BlobUploadResult>;
  fetchBlob(blobId: string): Promise<Uint8Array>;
  deleteBlob(blobId: string): Promise<void>;
}

