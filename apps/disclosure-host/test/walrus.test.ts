import { afterEach, describe, expect, it, vi } from "vitest";
import { WalrusProvider } from "../src/storage/walrus.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("WalrusProvider", () => {
  it("creates permanent blobs assigned to the configured Sui owner", async () => {
    const fetchMock = vi.fn(async (request: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(request));
      expect(url.pathname).toBe("/v1/blobs");
      expect(url.searchParams.get("epochs")).toBe("5");
      expect(url.searchParams.get("permanent")).toBe("true");
      expect(url.searchParams.get("send_object_to")).toBe("0xpublisher");
      expect(init?.headers).toEqual({ authorization: "Bearer upload-token" });
      return new Response(JSON.stringify({
        newlyCreated: { blobObject: { id: "0xblob-object", blobId: "walrus-blob" } },
      }));
    });
    vi.stubGlobal("fetch", fetchMock);
    const provider = new WalrusProvider(
      "https://publisher.example",
      "https://aggregator.example",
      5,
      "0xpublisher",
      "upload-token",
    );

    await expect(provider.uploadBlob(new Uint8Array([1, 2, 3]))).resolves.toEqual({
      blobId: "walrus-blob",
      suiObjectId: "0xblob-object",
      storage: "walrus",
    });
  });
});
