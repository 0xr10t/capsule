import { SealClient, SessionKey, type SealCompatibleClient } from "@mysten/seal";
import { Transaction } from "@mysten/sui/transactions";
import { fromHex } from "@mysten/sui/utils";
import type { CapsuleRecord, SealedStoredCapsule, StoredCapsule } from "@capsule/shared-types";

const testnetKeyServer =
  "0xb012378c9f3799fb5b1a7083da74a4069e3c3f1c93de0b27212a5799ce1e1e98";
const testnetAggregator = "https://seal-aggregator-testnet.mystenlabs.com";

export function isSealedCapsule(record: CapsuleRecord): record is SealedStoredCapsule {
  return "sealedCapsule" in record;
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
  const keyServerObjectId = import.meta.env.VITE_SEAL_KEY_SERVER_OBJECT_ID ?? testnetKeyServer;
  const aggregatorUrl = import.meta.env.VITE_SEAL_AGGREGATOR_URL ?? testnetAggregator;
  const client = new SealClient({
    suiClient: options.suiClient,
    serverConfigs: [{ objectId: keyServerObjectId, aggregatorUrl, weight: 1 }],
    verifyKeyServers: false,
  });
  const sessionKey = await SessionKey.create({
    address: options.address,
    packageId: record.sealedCapsule.packageId,
    ttlMin: 10,
    suiClient: options.suiClient,
  });
  const { signature } = await options.signPersonalMessage(sessionKey.getPersonalMessage());
  await sessionKey.setPersonalMessageSignature(signature);

  const transaction = new Transaction();
  transaction.moveCall({
    target: `${record.sealedCapsule.packageId}::capsule::seal_approve`,
    arguments: [
      transaction.pure.vector("u8", fromHex(record.sealedCapsule.identity)),
      transaction.object(record.sealedCapsule.suiPurchaseId),
    ],
  });
  const txBytes = await transaction.build({ client: options.suiClient, onlyTransactionKind: true });
  const plaintext = await client.decrypt({
    data: Uint8Array.from(atob(record.sealedCapsule.encryptedObject), (character) => character.charCodeAt(0)),
    sessionKey,
    txBytes,
  });
  return {
    capsule: JSON.parse(new TextDecoder().decode(plaintext)),
    capsuleBlobId: record.capsuleBlobId,
    sealProtected: true,
    walrusBlobObjectId: record.walrusBlobObjectId,
    suiDisclosureId: record.suiDisclosureId,
    disclosureTx: record.disclosureTx,
  };
}
