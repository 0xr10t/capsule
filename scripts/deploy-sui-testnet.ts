import "dotenv/config";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { decodeSuiPrivateKey, type Signer } from "@mysten/sui/cryptography";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Secp256k1Keypair } from "@mysten/sui/keypairs/secp256k1";
import { Secp256r1Keypair } from "@mysten/sui/keypairs/secp256r1";
import { getJsonRpcFullnodeUrl, SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { Transaction } from "@mysten/sui/transactions";

interface CompiledPackage {
  modules: string[];
  dependencies: string[];
}

function signerFromEnvironment(): Signer {
  const secretKey = process.env.SUI_PRIVATE_KEY;
  if (!secretKey) {
    throw new Error("Set SUI_PRIVATE_KEY in the gitignored .env file before deploying");
  }
  switch (decodeSuiPrivateKey(secretKey).scheme) {
    case "ED25519":
      return Ed25519Keypair.fromSecretKey(secretKey);
    case "Secp256k1":
      return Secp256k1Keypair.fromSecretKey(secretKey);
    case "Secp256r1":
      return Secp256r1Keypair.fromSecretKey(secretKey);
    default:
      throw new Error("The configured Sui private-key scheme cannot publish this package");
  }
}

function buildPackage(): CompiledPackage {
  const output = execFileSync(
    "sui",
    ["move", "build", "--dump-bytecode-as-base64", "--ignore-chain"],
    { cwd: resolve("packages/sui-contracts"), encoding: "utf8" },
  );
  const jsonStart = output.indexOf("{");
  if (jsonStart < 0) {
    throw new Error("Sui CLI did not emit package bytecode");
  }
  return JSON.parse(output.slice(jsonStart)) as CompiledPackage;
}

async function main(): Promise<void> {
  if ((process.env.SUI_NETWORK ?? "testnet") !== "testnet") {
    throw new Error("This deployment script intentionally publishes to Sui testnet only");
  }
  const signer = signerFromEnvironment();
  const client = new SuiJsonRpcClient({
    network: "testnet",
    url: process.env.SUI_RPC_URL ?? getJsonRpcFullnodeUrl("testnet"),
  });
  const address = signer.toSuiAddress();
  const balance = await client.getBalance({ owner: address });
  if (BigInt(balance.totalBalance) === 0n) {
    throw new Error(`Sui testnet publisher ${address} has no gas balance`);
  }

  const compiled = buildPackage();
  const transaction = new Transaction();
  const upgradeCap = transaction.publish(compiled);
  transaction.transferObjects([upgradeCap], address);
  const result = await client.signAndExecuteTransaction({
    signer,
    transaction,
    options: { showEffects: true, showObjectChanges: true },
  });
  if (result.effects?.status.status !== "success") {
    throw new Error("Package publication transaction failed");
  }
  const publication = result.objectChanges?.find((change) => change.type === "published");
  if (!publication || publication.type !== "published") {
    throw new Error("Package publication succeeded without a package object in its result");
  }
  console.log(`Published Capsule package on Sui testnet`);
  console.log(`Publisher: ${address}`);
  console.log(`Transaction: ${result.digest}`);
  console.log(`SUI_PACKAGE_ID=${publication.packageId}`);
  console.log(`VITE_CAPSULE_PACKAGE_ID=${publication.packageId}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
