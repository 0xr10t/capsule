import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import type {
  CapsuleRecord,
  ChainEntityType,
  ChainReconciliationRecord,
  ChainReconciliationSummary,
  DocumentListing,
  PurchaseReceipt,
} from "@capsule/shared-types";
import { capsuleIndex } from "./store.js";

interface PublicObjectResponse {
  data?: {
    content?: {
      dataType: string;
      type: string;
      fields: Record<string, unknown>;
    } | null;
    previousTransaction?: string | null;
  } | null;
  error?: {
    code?: string;
  } | null;
}

export interface PublicObjectReader {
  getObject(input: {
    id: string;
    options: { showContent: boolean; showType: boolean; showPreviousTransaction: boolean };
  }): Promise<PublicObjectResponse>;
  getTransactionBlock(input: {
    digest: string;
    options: { showObjectChanges: boolean };
  }): Promise<{
    objectChanges?: Array<{ type: string; objectId?: string }> | null;
  }>;
}

function stringField(value: unknown, label: string): string {
  if (typeof value === "string") {
    return value;
  }
  throw new Error(`Unreadable ${label}`);
}

function numberField(value: unknown, label: string): number {
  const parsed = typeof value === "string" || typeof value === "number" ? Number(value) : Number.NaN;
  if (Number.isSafeInteger(parsed) && parsed >= 0) {
    return parsed;
  }
  throw new Error(`Unreadable ${label}`);
}

function byteArray(value: unknown, label: string): Uint8Array {
  if (Array.isArray(value) && value.every((part) => Number.isInteger(part) && part >= 0 && part <= 255)) {
    return Uint8Array.from(value as number[]);
  }
  throw new Error(`Unreadable ${label}`);
}

function equalId(left: string, right: string): boolean {
  return left.toLowerCase() === right.toLowerCase();
}

function addMismatch(mismatches: string[], label: string, actual: unknown, expected: unknown): void {
  if (actual !== expected) {
    mismatches.push(`${label} does not match local record`);
  }
}

export class SuiReconciler {
  constructor(
    private readonly packageId: string,
    private readonly reader: PublicObjectReader,
  ) {}

  private async inspect(
    entityType: ChainEntityType,
    entityId: string,
    suiObjectId: string,
    expectedType: string,
    checkedAt: string,
    validate: (fields: Record<string, unknown>, previousTransaction?: string) => string[],
  ): Promise<ChainReconciliationRecord> {
    try {
      const result = await this.reader.getObject({
        id: suiObjectId,
        options: { showContent: true, showType: true, showPreviousTransaction: true },
      });
      const content = result.data?.content;
      if (!content || content.dataType !== "moveObject") {
        return {
          entityType,
          entityId,
          suiObjectId,
          status: "missing",
          checkedAt,
          details: `Sui object is unavailable (${result.error?.code ?? "no move content"})`,
        };
      }
      if (content.type !== expectedType) {
        return {
          entityType,
          entityId,
          suiObjectId,
          status: "mismatch",
          checkedAt,
          transactionDigest: result.data?.previousTransaction ?? undefined,
          details: `Expected ${expectedType}, received ${content.type}`,
        };
      }
      const transactionDigest = result.data?.previousTransaction ?? undefined;
      const mismatches = validate(content.fields, transactionDigest);
      return {
        entityType,
        entityId,
        suiObjectId,
        status: mismatches.length === 0 ? "verified" : "mismatch",
        checkedAt,
        transactionDigest,
        details: mismatches.length === 0 ? undefined : mismatches.join("; "),
      };
    } catch (error) {
      return {
        entityType,
        entityId,
        suiObjectId,
        status: "error",
        checkedAt,
        details: error instanceof Error ? error.message : "Unknown Sui read error",
      };
    }
  }

  async reconcile(
    documents: DocumentListing[],
    purchases: PurchaseReceipt[],
    capsules: CapsuleRecord[],
  ): Promise<ChainReconciliationSummary> {
    const checkedAt = new Date().toISOString();
    const records: ChainReconciliationRecord[] = [];
    const documentsById = new Map(documents.map((document) => [document.id, document]));

    for (const document of documents) {
      if (document.suiDocumentId) {
        records.push(await this.inspect(
          "document",
          document.id,
          document.suiDocumentId,
          `${this.packageId}::capsule::Document`,
          checkedAt,
          (fields, transactionDigest) => {
            const mismatches: string[] = [];
            addMismatch(mismatches, "root hash", Buffer.from(byteArray(fields.root_hash, "document root")).toString("hex"), document.rootHash);
            addMismatch(mismatches, "Walrus blob", Buffer.from(byteArray(fields.walrus_blob_id, "document blob")).toString("utf8"), document.encryptedBlobId);
            addMismatch(mismatches, "line count", numberField(fields.line_count, "line count"), document.lineCount);
            addMismatch(mismatches, "price", stringField(fields.price_per_line_mist, "price"), document.pricePerLineMist);
            if (!equalId(stringField(fields.owner, "document owner"), document.publisher)) {
              mismatches.push("publisher does not match document owner");
            }
            if (document.documentTx) {
              addMismatch(mismatches, "registration transaction", transactionDigest, document.documentTx);
            }
            return mismatches;
          },
        ));
      }

      for (const fragment of document.fragments ?? []) {
        if (!fragment.suiFragmentId || !document.suiDocumentId) {
          continue;
        }
        records.push(await this.inspect(
          "fragment",
          fragment.suiFragmentId,
          fragment.suiFragmentId,
          `${this.packageId}::capsule::Fragment`,
          checkedAt,
          (fields, transactionDigest) => {
            const mismatches: string[] = [];
            if (!equalId(stringField(fields.document_id, "fragment document ID"), document.suiDocumentId!)) {
              mismatches.push("document ID does not match local record");
            }
            addMismatch(mismatches, "Seal identity", Buffer.from(byteArray(fields.seal_identity, "Seal identity")).toString("hex"), fragment.sealIdentity);
            addMismatch(mismatches, "line start", numberField(fields.line_start, "line start"), fragment.range.start);
            addMismatch(mismatches, "line end", numberField(fields.line_end, "line end"), fragment.range.end);
            addMismatch(mismatches, "Walrus blob", Buffer.from(byteArray(fields.walrus_blob_id, "fragment blob")).toString("utf8"), fragment.encryptedBlobId);
            if (fragment.registrationTx) {
              addMismatch(mismatches, "registration transaction", transactionDigest, fragment.registrationTx);
            }
            return mismatches;
          },
        ));
      }
    }

    for (const purchase of purchases) {
      if (!purchase.suiPurchaseId) {
        continue;
      }
      const document = documentsById.get(purchase.documentId);
      let paymentMismatch: string | undefined;
      try {
        const payment = await this.reader.getTransactionBlock({
          digest: purchase.paymentTx,
          options: { showObjectChanges: true },
        });
        const createdPurchase = payment.objectChanges?.some((change) =>
          change.type === "created" &&
          typeof change.objectId === "string" &&
          equalId(change.objectId, purchase.suiPurchaseId!)
        );
        if (!createdPurchase) {
          paymentMismatch = "payment transaction did not create this Purchase object";
        }
      } catch (error) {
        paymentMismatch = error instanceof Error
          ? `payment transaction cannot be read: ${error.message}`
          : "payment transaction cannot be read";
      }
      records.push(await this.inspect(
        "purchase",
        purchase.id,
        purchase.suiPurchaseId,
        `${this.packageId}::capsule::Purchase`,
        checkedAt,
        (fields, transactionDigest) => {
          const mismatches: string[] = [];
          if (paymentMismatch) {
            mismatches.push(paymentMismatch);
          }
          if (!document?.suiDocumentId) {
            mismatches.push("local listing has no Sui document ID");
          } else if (!equalId(stringField(fields.document_id, "purchase document ID"), document.suiDocumentId)) {
            mismatches.push("document ID does not match local record");
          }
          if (!equalId(stringField(fields.buyer, "purchase buyer"), purchase.buyer)) {
            mismatches.push("buyer does not match local record");
          }
          addMismatch(mismatches, "line start", numberField(fields.line_start, "line start"), purchase.range.start);
          addMismatch(mismatches, "line end", numberField(fields.line_end, "line end"), purchase.range.end);
          addMismatch(mismatches, "amount", stringField(fields.amount_mist, "amount"), purchase.amountMist);
          if (purchase.suiFragmentId && !equalId(stringField(fields.fragment_id, "purchase fragment ID"), purchase.suiFragmentId)) {
            mismatches.push("fragment ID does not match local record");
          }
          return mismatches;
        },
      ));
    }

    for (const stored of capsules) {
      const summary = capsuleIndex(stored);
      const disclosureId = stored.suiDisclosureId ?? summary.suiDisclosureId;
      if (!disclosureId) {
        continue;
      }
      records.push(await this.inspect(
        "disclosure",
        summary.capsuleId,
        disclosureId,
        `${this.packageId}::capsule::Disclosure`,
        checkedAt,
        (fields, transactionDigest) => {
          const mismatches: string[] = [];
          if (summary.suiDocumentId && !equalId(stringField(fields.document_id, "disclosure document ID"), summary.suiDocumentId)) {
            mismatches.push("document ID does not match local record");
          }
          if (summary.suiPurchaseId && !equalId(stringField(fields.purchase_id, "disclosure purchase ID"), summary.suiPurchaseId)) {
            mismatches.push("purchase ID does not match local record");
          }
          if (!equalId(stringField(fields.buyer, "disclosure buyer"), summary.buyer)) {
            mismatches.push("buyer does not match local record");
          }
          addMismatch(mismatches, "line start", numberField(fields.line_start, "line start"), summary.lineRange.start);
          addMismatch(mismatches, "line end", numberField(fields.line_end, "line end"), summary.lineRange.end);
          addMismatch(mismatches, "Walrus blob", Buffer.from(byteArray(fields.walrus_capsule_blob, "capsule blob")).toString("utf8"), stored.capsuleBlobId);
          if (stored.disclosureTx) {
            addMismatch(mismatches, "disclosure transaction", transactionDigest, stored.disclosureTx);
          }
          return mismatches;
        },
      ));
    }

    return {
      checkedAt,
      checked: records.length,
      verified: records.filter((record) => record.status === "verified").length,
      failed: records.filter((record) => record.status !== "verified").length,
      records,
    };
  }
}

export function createConfiguredSuiReconciler(): SuiReconciler | undefined {
  if (!process.env.SUI_PACKAGE_ID) {
    return undefined;
  }
  const network = process.env.SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
  const client = new SuiJsonRpcClient({
    network,
    url: process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl(network),
  });
  return new SuiReconciler(process.env.SUI_PACKAGE_ID, client);
}
