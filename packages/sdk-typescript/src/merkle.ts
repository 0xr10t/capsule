import type {
  DisclosureCapsule,
  HexHash,
  LineProof,
  MerkleRangeProof,
  ProofNode,
  VerifyResult,
} from "@capsule/shared-types";

const encoder = new TextEncoder();
const saltedLeafDomain = encoder.encode("capsule:salted-leaf:v1");
const paddingLeafDomain = encoder.encode("capsule:padding-leaf:v1");

interface MerkleOptions {
  leafSalts?: string[];
  salted?: boolean;
}

function toHex(value: Uint8Array): string {
  return Array.from(value, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value: string, label = "SHA-256 hash"): Uint8Array {
  if (!/^[\da-f]{64}$/i.test(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await globalThis.crypto.subtle.digest("SHA-256", bytes as BufferSource));
}

async function hashLine(line: string): Promise<Uint8Array> {
  return sha256(encoder.encode(line));
}

function randomSalt(): string {
  return toHex(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

function indexBytes(index: number): Uint8Array {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, BigInt(index));
  return bytes;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let cursor = 0;
  for (const part of parts) {
    bytes.set(part, cursor);
    cursor += part.length;
  }
  return bytes;
}

async function hashSaltedLine(line: string, index: number, salt: string): Promise<Uint8Array> {
  return sha256(concat([saltedLeafDomain, indexBytes(index), fromHex(salt, "leaf salt"), encoder.encode(line)]));
}

async function hashPaddingLeaf(index: number): Promise<Uint8Array> {
  return sha256(concat([paddingLeafDomain, indexBytes(index)]));
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

function resolveSalts(lines: string[], options: MerkleOptions = {}): string[] | undefined {
  if (options.leafSalts) {
    if (options.leafSalts.length !== lines.length) {
      throw new Error("Leaf salt count must match document line count");
    }
    return options.leafSalts;
  }
  return options.salted ? lines.map(randomSalt) : undefined;
}

async function createLevels(linesInput: string[], options: MerkleOptions = {}): Promise<{
  levels: Uint8Array[][];
  leafSalts?: string[];
  leafHashing: "plain-sha256" | "salted-sha256-v1";
}> {
  const lines = linesInput.length === 0 ? [""] : linesInput;
  const leafSalts = resolveSalts(lines, options);
  const paddedLeafCount = 2 ** Math.ceil(Math.log2(lines.length));
  const leaves = await Promise.all(lines.map((line, index) =>
    leafSalts ? hashSaltedLine(line, index, leafSalts[index]!) : hashLine(line)
  ));
  const padding = leafSalts ? undefined : await hashLine("");
  while (leaves.length < paddedLeafCount) {
    leaves.push(leafSalts ? await hashPaddingLeaf(leaves.length) : padding!);
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
  return {
    levels,
    leafSalts,
    leafHashing: leafSalts ? "salted-sha256-v1" : "plain-sha256",
  };
}

export async function buildMerkleTree(linesInput: string[], options: MerkleOptions = {}): Promise<{
  rootHash: HexHash;
  leafCount: number;
  paddedLeafCount: number;
  leafHashing: "plain-sha256" | "salted-sha256-v1";
  leafSalts?: string[];
}> {
  const lines = linesInput.length === 0 ? [""] : linesInput;
  const { levels, leafSalts, leafHashing } = await createLevels(lines, options);
  return {
    rootHash: toHex(levels.at(-1)![0]!),
    leafCount: lines.length,
    paddedLeafCount: levels[0]!.length,
    leafHashing,
    leafSalts,
  };
}

export async function generateRangeProof(
  linesInput: string[],
  start: number,
  end: number,
  options: MerkleOptions = {},
): Promise<MerkleRangeProof> {
  const lines = linesInput.length === 0 ? [""] : linesInput;
  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start > end || end >= lines.length) {
    throw new Error("Requested disclosure range is outside the document");
  }
  const { levels, leafSalts, leafHashing } = await createLevels(lines, options);
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
    proofs.push({ lineIndex, leafSalt: leafSalts?.[lineIndex], siblings });
  }
  return {
    algorithm: "sha256",
    leafHashing,
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
    let current: Uint8Array;
    try {
      current = proof.leafHashing === "salted-sha256-v1"
        ? await hashSaltedLine(content, lineProof.lineIndex, lineProof.leafSalt ?? "")
        : await hashLine(content);
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
