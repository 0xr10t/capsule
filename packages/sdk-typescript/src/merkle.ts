import type {
  DisclosureCapsule,
  HexHash,
  LineProof,
  MerkleRangeProof,
  ProofNode,
  VerifyResult,
} from "@capsule/shared-types";

const encoder = new TextEncoder();

function toHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string): Uint8Array {
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new Error("Invalid SHA-256 hash");
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource));
}

async function hashLine(line: string): Promise<Uint8Array> {
  return sha256(encoder.encode(line));
}

async function hashPair(left: Uint8Array, right: Uint8Array): Promise<Uint8Array> {
  const bytes = new Uint8Array(left.length + right.length);
  bytes.set(left);
  bytes.set(right, left.length);
  return sha256(bytes);
}

export function splitLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

async function createLevels(linesInput: string[]): Promise<Uint8Array[][]> {
  const lines = linesInput.length === 0 ? [""] : linesInput;
  const paddedLeafCount = 2 ** Math.ceil(Math.log2(lines.length));
  const leaves = await Promise.all(lines.map(hashLine));
  const padding = await hashLine("");
  while (leaves.length < paddedLeafCount) {
    leaves.push(padding);
  }
  const levels = [leaves];
  while (levels.at(-1)!.length > 1) {
    const previous = levels.at(-1)!;
    const current: Uint8Array[] = [];
    for (let index = 0; index < previous.length; index += 2) {
      current.push(await hashPair(previous[index]!, previous[index + 1]!));
    }
    levels.push(current);
  }
  return levels;
}

export async function buildMerkleTree(linesInput: string[]): Promise<{
  rootHash: HexHash;
  leafCount: number;
  paddedLeafCount: number;
}> {
  const lines = linesInput.length === 0 ? [""] : linesInput;
  const levels = await createLevels(lines);
  return {
    rootHash: toHex(levels.at(-1)![0]!),
    leafCount: lines.length,
    paddedLeafCount: levels[0]!.length,
  };
}

export async function generateRangeProof(
  linesInput: string[],
  start: number,
  end: number,
): Promise<MerkleRangeProof> {
  const lines = linesInput.length === 0 ? [""] : linesInput;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || end >= lines.length) {
    throw new Error("Requested disclosure range is outside the document");
  }
  const levels = await createLevels(lines);
  const proofs: LineProof[] = [];
  for (let lineIndex = start; lineIndex <= end; lineIndex += 1) {
    const siblings: ProofNode[] = [];
    let cursor = lineIndex;
    for (const level of levels.slice(0, -1)) {
      const isRight = cursor % 2 === 1;
      const siblingIndex = isRight ? cursor - 1 : cursor + 1;
      siblings.push({
        hash: toHex(level[siblingIndex]!),
        position: isRight ? "left" : "right",
      });
      cursor = Math.floor(cursor / 2);
    }
    proofs.push({ lineIndex, siblings });
  }
  return {
    algorithm: "sha256",
    leafCount: lines.length,
    paddedLeafCount: levels[0]!.length,
    range: { start, end },
    proofs,
  };
}

export async function verifyRangeProof(
  disclosedContent: string[],
  proof: MerkleRangeProof,
  expectedRoot: HexHash,
): Promise<VerifyResult> {
  const invalid = (reason: string, computedRoot = ""): VerifyResult => ({
    valid: false,
    computedRoot,
    expectedRoot,
    reason,
  });
  if (
    proof.algorithm !== "sha256" ||
    proof.range.start > proof.range.end ||
    proof.proofs.length !== disclosedContent.length ||
    disclosedContent.length !== proof.range.end - proof.range.start + 1
  ) {
    return invalid("Proof shape does not match disclosed range");
  }
  let computedRoot = "";
  for (const [offset, content] of disclosedContent.entries()) {
    const lineProof = proof.proofs[offset]!;
    if (lineProof.lineIndex !== proof.range.start + offset) {
      return invalid("Line indices are not contiguous");
    }
    let current = await hashLine(content);
    try {
      for (const node of lineProof.siblings) {
        const sibling = fromHex(node.hash);
        current = node.position === "left"
          ? await hashPair(sibling, current)
          : await hashPair(current, sibling);
      }
    } catch (error) {
      return invalid(error instanceof Error ? error.message : "Invalid proof");
    }
    computedRoot = toHex(current);
    if (computedRoot !== expectedRoot) {
      return invalid("Disclosed content is not included in the committed document", computedRoot);
    }
  }
  return { valid: true, computedRoot, expectedRoot };
}

export async function verifyCapsule(capsule: DisclosureCapsule): Promise<VerifyResult> {
  const inclusion = await verifyRangeProof(capsule.disclosedContent, capsule.proof, capsule.rootHash);
  if (!inclusion.valid) {
    return inclusion;
  }
  if (capsule.disclosureMode === "publisher-sealed-fragment" && !capsule.signature && !capsule.signerPublicKey) {
    return inclusion;
  }
  if (!capsule.signature || !capsule.signerPublicKey) {
    return { ...inclusion, valid: false, reason: "Capsule attestation is missing" };
  }
  const { signature, signerPublicKey, ...unsignedCapsule } = capsule;
  try {
    const pemPayload = signerPublicKey
      .replace("-----BEGIN PUBLIC KEY-----", "")
      .replace("-----END PUBLIC KEY-----", "")
      .replace(/\s/g, "");
    const publicKey = await globalThis.crypto.subtle.importKey(
      "spki",
      Uint8Array.from(globalThis.atob(pemPayload), (character) => character.charCodeAt(0)),
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    const signatureValid = await globalThis.crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      Uint8Array.from(globalThis.atob(signature), (character) => character.charCodeAt(0)),
      encoder.encode(JSON.stringify(unsignedCapsule)),
    );
    if (!signatureValid) {
      return { ...inclusion, valid: false, reason: "Capsule attestation signature is invalid" };
    }
  } catch {
    return { ...inclusion, valid: false, reason: "Capsule attestation cannot be validated" };
  }
  return inclusion;
}
