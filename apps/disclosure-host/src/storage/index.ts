import type { StorageProvider } from "./provider.js";
import { MemoryProvider } from "./memory.js";
import { WalrusProvider } from "./walrus.js";

export function createStorageProvider(): StorageProvider {
  if (process.env.STORAGE_DRIVER === "walrus") {
    return new WalrusProvider(
      process.env.WALRUS_PUBLISHER_URL ?? "https://publisher.walrus-testnet.walrus.space",
      process.env.WALRUS_AGGREGATOR_URL ?? "https://aggregator.walrus-testnet.walrus.space",
      Number(process.env.WALRUS_EPOCHS ?? 3),
    );
  }
  return new MemoryProvider();
}

export type { StorageProvider } from "./provider.js";

