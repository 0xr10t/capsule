import { SealClient, SessionKey, type SealCompatibleClient } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import type {
  CapsuleRecord,
  PrecomputedFragmentPayload,
  PublisherSealedFragment,
  SealedStoredCapsule,
  StoredCapsule,
} from "@capsule/shared-types";

const testnetKeyServer =
  "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";
const testnetAggregator = "https://seal-aggregator-testnet.mystenlabs.com";

export function isSealedCapsule(record: CapsuleRecord): record is SealedStoredCapsule {
  return "sealedCapsule" in record;
}

function createSealClient(suiClient: SealCompatibleClient): SealClient {
  const keyServerObjectId = import.meta.env.VITE_SEAL_KEY_SERVER_OBJECT_ID ?? testnetKeyServer;
  const aggregatorUrl = import.meta.env.VITE_SEAL_AGGREGATOR_URL ?? testnetAggregator;
  return new SealClient({
    suiClient,
    serverConfigs: [{ objectId: keyServerObjectId, aggregatorUrl, weight: 1 }],
    verifyKeyServers: false,
  });
}

function randomIdentity(): string {
  return Array.from(globalThis.crypto.getRandomValues(new Uint8Array(32)), (value) =>
    value.toString(16).padStart(2, "0")
  ).join("");
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 32_768) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 32_768));
  }
  return btoa(binary);
}

export async function sealFragmentForPublication(
  payload: PrecomputedFragmentPayload,
  packageId: string,
  suiClient: SealCompatibleClient,
): Promise<PublisherSealedFragment> {
  const identity = randomIdentity();
  const threshold = Number(import.meta.env.VITE_SEAL_THRESHOLD ?? 1);
  const { encryptedObject } = await createSealClient(suiClient).encrypt({
    threshold,
    packageId,
    id: identity,
    data: new TextEncoder().encode(JSON.stringify(payload)),
  });
  return {
    range: payload.lineRange,
    envelope: {
      version: "1",
      algorithm: "SEAL",
      packageId,
      identity,
      encryptedObject: toBase64(encryptedObject),
    },
  };
}

interface DecryptOptions {
  address: string;
  suiClient: SealCompatibleClient;
  signPersonalMessage: (message: Uint8Array) => Promise<{ signature: string }>;
}

export async function unlockCapsule(record: CapsuleRecord, options: DecryptOptions): Promise<StoredCapsule> {
  if (!isSealedCapsule(record)) {
    return record;
  }
  const client = createSealClient(options.suiClient);
  const sessionKey = await SessionKey.create({
    address: options.address,
    packageId: record.sealedCapsule.packageId,
    ttlMin: 10,
    suiClient: options.suiClient,
  });
  const { signature } = await options.signPersonalMessage(sessionKey.getPersonalMessage());
  await sessionKey.setPersonalMessageSignature(signature);

  const transaction = new Transaction();
  if (record.sealedCapsule.accessPolicy === "published-fragment") {
    if (!record.summary.suiDocumentId || !record.sealedCapsule.suiFragmentId) {
      throw new Error("Sealed fragment is missing its Sui policy objects.");
    }
    transaction.moveCall({
      target: `${record.sealedCapsule.packageId}::capsule::seal_approve_fragment`,
      arguments: [
        transaction.pure.vector("u8", fromHex(record.sealedCapsule.identity)),
        transaction.object(record.summary.suiDocumentId),
        transaction.object(record.sealedCapsule.suiFragmentId),
        transaction.object(record.sealedCapsule.suiPurchaseId),
      ],
    });
  } else {
    transaction.moveCall({
      target: `${record.sealedCapsule.packageId}::capsule::seal_approve`,
      arguments: [
        transaction.pure.vector("u8", fromHex(record.sealedCapsule.identity)),
        transaction.object(record.sealedCapsule.suiPurchaseId),
      ],
    });
  }
  const txBytes = await transaction.build({ client: options.suiClient, onlyTransactionKind: true });
  const plaintext = await client.decrypt({
    data: Uint8Array.from(atob(record.sealedCapsule.encryptedObject), (character) => character.charCodeAt(0)),
    sessionKey,
    txBytes,
  });
  const decoded = JSON.parse(new TextDecoder().decode(plaintext));
  const capsule = record.sealedCapsule.accessPolicy === "published-fragment"
    ? {
        ...(decoded as PrecomputedFragmentPayload),
        capsuleId: record.summary.capsuleId,
        documentId: record.summary.documentId,
        documentBlobId: record.summary.documentBlobId ?? record.capsuleBlobId,
        createdAt: record.summary.createdAt,
        paymentTx: record.summary.paymentTx,
        suiPurchaseId: record.summary.suiPurchaseId,
        buyer: record.summary.buyer,
        publisher: record.summary.publisher,
        suiDocumentId: record.summary.suiDocumentId,
        disclosureMode: "publisher-sealed-fragment" as const,
      }
    : decoded;
  return {
    capsule,
    capsuleBlobId: record.capsuleBlobId,
    sealProtected: true,
    walrusBlobObjectId: record.walrusBlobObjectId,
    suiDisclosureId: record.suiDisclosureId,
    disclosureTx: record.disclosureTx,
  };
}
