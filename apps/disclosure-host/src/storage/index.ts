import type { StorageProvider } from "./provider.js";
import { MemoryProvider } from "./memory.js";
import { WalrusProvider } from "./walrus.js";

export function createStorageProvider(ownerAddress?: string): StorageProvider {
  if (process.env.PROTOCOL_MODE === "testnet" && process.env.STORAGE_DRIVER !== "walrus") {
    throw new Error("PROTOCOL_MODE=testnet requires STORAGE_DRIVER=walrus");
  }
  if (process.env.STORAGE_DRIVER === "walrus") {
    return new WalrusProvider(
      process.env.WALRUS_PUBLISHER_URL ?? "https://publisher.walrus-testnet.walrus.space",
      process.env.WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-testnet.walrus.space",
      Number(process.env.WALRUS_EPOCHS ?? 3),
      ownerAddress,
      process.env.WALRUS_AUTH_TOKEN || undefined,
    );
  }
  return new MemoryProvider();
}

export type { StorageProvider } from "./provider.js";
