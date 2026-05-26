import { decodeSuiPrivateKey, type Signer } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";

export interface ChainRecord {
  objectId: string;
  transactionDigest: string;
}

function configuredSigner(secretKey: string): Signer {
  switch (decodeSuiPrivateKey(secretKey).scheme) {
    case "ED25519":
      return Ed25519Keypair.fromSecretKey(secretKey);
    case "Secp256k1":
      return Secp256k1Keypair.fromSecretKey(secretKey);
    case "Secp256r1":
      return Secp256r1Keypair.fromSecretKey(secretKey);
    default:
      throw new Error("Unsupported Sui signer scheme");
  }
}

function bytes(value: string): number[] {
  return Array.from(Buffer.from(value, "utf8"));
}

function rootBytes(rootHash: string): number[] {
  return Array.from(Buffer.from(rootHash, "hex"));
}

function requiredObjectId(
  changes: Awaited<ReturnType<SuiJsonRpcClient["signAndExecuteTransaction"]>>["objectChanges"],
  objectType: string,
): string {
  const object = changes?.find((change) =>
    change.type === "created" && change.objectType === objectType
  );
  if (!object || object.type !== "created") {
    throw new Error(`Sui transaction did not create ${objectType}`);
  }
  return object.objectId;
}

function fieldBytes(value: unknown): Uint8Array {
  if (Array.isArray(value) && value.every((entry) => typeof entry === "number")) {
    return Uint8Array.from(value as number[]);
  }
  throw new Error("Sui document root has an unexpected representation");
}

export class SuiAnchorProvider {
  readonly address: string;
  private readonly client: SuiJsonRpcClient;
  private readonly signer: Signer;

  constructor(private readonly packageId: string, secretKey: string) {
    this.signer = configuredSigner(secretKey);
    this.address = this.signer.toSuiAddress();
    const network = process.env.SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
    this.client = new SuiJsonRpcClient({
      network,
      url: process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(network),
    });
  }

  async registerDocument(rootHash: string, walrusBlobId: string): Promise<ChainRecord> {
    const transaction = new Transaction();
    transaction.moveCall({
      target: `${this.packageId}::capsule::register_document`,
      arguments: [
        transaction.pure.vector("u8", rootBytes(rootHash)),
        transaction.pure.vector("u8", bytes(walrusBlobId)),
        transaction.object.clock(),
      ],
    });
    const result = await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction,
      options: { showEffects: true, showObjectChanges: true },
    });
    if (result.effects?.status.status !== "success") {
      throw new Error("Sui rejected document commitment transaction");
    }
    return {
      objectId: requiredObjectId(result.objectChanges, `${this.packageId}::capsule::Document`),
      transactionDigest: result.digest,
    };
  }

  async recordDisclosure(
    documentId: string,
    buyer: string,
    lineStart: number,
    lineEnd: number,
    capsuleBlobId: string,
  ): Promise<ChainRecord> {
    const transaction = new Transaction();
    transaction.moveCall({
      target: `${this.packageId}::capsule::record_disclosure`,
      arguments: [
        transaction.object(documentId),
        transaction.pure.address(buyer),
        transaction.pure.u64(lineStart),
        transaction.pure.u64(lineEnd),
        transaction.pure.vector("u8", bytes(capsuleBlobId)),
        transaction.object.clock(),
      ],
    });
    const result = await this.client.signAndExecuteTransaction({
      signer: this.signer,
      transaction,
      options: { showEffects: true, showObjectChanges: true },
    });
    if (result.effects?.status.status !== "success") {
      throw new Error("Sui rejected disclosure provenance transaction");
    }
    return {
      objectId: requiredObjectId(result.objectChanges, `${this.packageId}::capsule::Disclosure`),
      transactionDigest: result.digest,
    };
  }

  async documentRoot(documentId: string): Promise<string> {
    const result = await this.client.getObject({
      id: documentId,
      options: { showContent: true, showType: true },
    });
    const content = result.data?.content;
    if (!content || content.dataType !== "moveObject" || content.type !== `${this.packageId}::capsule::Document`) {
      throw new Error("Sui anchor is not a Capsule Document object");
    }
    const fields = content.fields as { root_hash?: unknown };
    return Buffer.from(fieldBytes(fields.root_hash)).toString("hex");
  }
}

export function createSuiAnchorProvider(): SuiAnchorProvider | undefined {
  const testnetMode = process.env.PROTOCOL_MODE === "testnet";
  const packageId = process.env.SUI_PACKAGE_ID;
  const secretKey = process.env.SUI_PRIVATE_KEY;
  if (!testnetMode && (!packageId || !secretKey)) {
    return undefined;
  }
  if (!packageId || !secretKey) {
    throw new Error("PROTOCOL_MODE=testnet requires SUI_PACKAGE_ID and SUI_PRIVATE_KEY");
  }
  return new SuiAnchorProvider(packageId, secretKey);
}
