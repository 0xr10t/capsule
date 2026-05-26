import { SealClient } from "@mysten/seal";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type { DisclosureCapsule, SealedCapsuleEnvelope } from "@capsule/shared-types";

const testnetKeyServer =
  "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";
const testnetAggregator = "https://seal-aggregator-testnet.mystenlabs.com";

export class CapsuleSealer {
  private readonly client: SealClient;
  private readonly threshold: number;

  constructor(private readonly packageId: string) {
    const network = process.env.SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
    const keyServerObjectId = process.env.SEAL_KEY_SERVER_OBJECT_ID ?? testnetKeyServer;
    const aggregatorUrl = process.env.SEAL_AGGREGATOR_URL ?? testnetAggregator;
    this.threshold = Number(process.env.SEAL_THRESHOLD ?? 1);
    if (!Number.isInteger(this.threshold) || this.threshold < 1) {
      throw new Error("SEAL_THRESHOLD must be a positive integer");
    }
    const suiClient = new SuiJsonRpcClient({
      network,
      url: process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(network),
    });
    this.client = new SealClient({
      suiClient,
      serverConfigs: [{ objectId: keyServerObjectId, aggregatorUrl, weight: 1 }],
      verifyKeyServers: false,
    });
  }

  async encryptCapsule(capsule: DisclosureCapsule, suiPurchaseId: string): Promise<SealedCapsuleEnvelope> {
    const plaintext = new TextEncoder().encode(JSON.stringify(capsule));
    const { encryptedObject } = await this.client.encrypt({
      threshold: this.threshold,
      packageId: this.packageId,
      id: suiPurchaseId,
      data: plaintext,
    });
    return {
      version: "1",
      algorithm: "SEAL",
      packageId: this.packageId,
      identity: suiPurchaseId,
      encryptedObject: Buffer.from(encryptedObject).toString("base64"),
      suiPurchaseId,
    };
  }
}

export function createCapsuleSealer(): CapsuleSealer | undefined {
  if (process.env.SEAL_CAPSULES !== "true") {
    return undefined;
  }
  if (process.env.PROTOCOL_MODE !== "testnet" || !process.env.SUI_PACKAGE_ID) {
    throw new Error("SEAL_CAPSULES=true requires testnet mode and SUI_PACKAGE_ID");
  }
  return new CapsuleSealer(process.env.SUI_PACKAGE_ID);
}
