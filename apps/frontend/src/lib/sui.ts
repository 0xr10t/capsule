import type { DisclosureCapsule, VerifyResult } from "@capsule/shared-types";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

const network = import.meta.env.VITE_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet";
const packageId = import.meta.env.VITE_CAPSULE_PACKAGE_ID as string | undefined;
const client = new SuiJsonRpcClient({ network, url: getJsonRpcFullnodeUrl(network) });

function rootFieldToHex(value: unknown): string {
  if (Array.isArray(value) && value.every((byte) => typeof byte === "number")) {
    return Array.from(value as number[], (byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  throw new Error("Sui Document contains an unreadable root hash");
}

export async function verifySuiDocumentAnchor(
  capsule: DisclosureCapsule,
  localResult: VerifyResult,
): Promise<VerifyResult> {
  if (!capsule.suiDocumentId || !packageId) {
    return { ...localResult, anchored: false, suiDocumentId: capsule.suiDocumentId };
  }
  const result = await client.getObject({
    id: capsule.suiDocumentId,
    options: { showContent: true, showType: true },
  });
  const content = result.data?.content;
  if (!content || content.dataType !== "moveObject" || content.type !== `${packageId}::capsule::Document`) {
    return { ...localResult, valid: false, anchored: false, reason: "Sui Document anchor was not found" };
  }
  const chainRoot = rootFieldToHex((content.fields as { root_hash?: unknown }).root_hash);
  return {
    ...localResult,
    valid: localResult.valid && chainRoot === capsule.rootHash,
    anchored: localResult.valid && chainRoot === capsule.rootHash,
    chainRoot,
    suiDocumentId: capsule.suiDocumentId,
    reason: chainRoot === capsule.rootHash ? localResult.reason : "Capsule root does not match its Sui Document anchor",
  };
}
