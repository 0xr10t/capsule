import {
  createCipheriv,
  createDecipheriv,
  generateKeyPairSync,
  randomBytes,
  sign,
} from "node:crypto";
import type { EncryptedDocumentEnvelope } from "@capsule/shared-types";

export interface EncryptedPayload {
  envelope: EncryptedDocumentEnvelope;
  key: Buffer;
}

export function encryptDocument(content: string): EncryptedPayload {
  const key = randomBytes(32);
  const initializationVector = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, initializationVector);
  const ciphertext = Buffer.concat([cipher.update(content, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    key,
    envelope: {
      version: "1",
      algorithm: "AES-256-GCM",
      initializationVector: initializationVector.toString("base64"),
      ciphertext: Buffer.concat([ciphertext, authTag]).toString("base64"),
    },
  };
}

export function decryptDocument(envelope: EncryptedDocumentEnvelope, key: Buffer): string {
  const encryptedBytes = Buffer.from(envelope.ciphertext, "base64");
  const authTag = encryptedBytes.subarray(encryptedBytes.length - 16);
  const ciphertext = encryptedBytes.subarray(0, encryptedBytes.length - 16);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(envelope.initializationVector, "base64"),
  );
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

const signingKeys = generateKeyPairSync("ed25519");

export function signCapsule(payload: object): { signature: string; signerPublicKey: string } {
  const bytes = Buffer.from(JSON.stringify(payload));
  return {
    signature: sign(null, bytes, signingKeys.privateKey).toString("base64"),
    signerPublicKey: signingKeys.publicKey.export({ type: "spki", format: "pem" }).toString(),
  };
}

