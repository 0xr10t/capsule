import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, extname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

dotenv.config();

type Headers = Record<string, Record<string, string>>;

interface WalrusSiteResources {
  object_id?: string;
  routes?: Record<string, string>;
  metadata?: Record<string, string>;
  headers?: Headers;
  ignore?: string[];
}

interface Options {
  context: string;
  epochs: string;
  objectId?: string;
  config?: string;
  siteBuilder: string;
  walrusBinary?: string;
  dryRun: boolean;
  skipBuild: boolean;
  allowLocalApis: boolean;
}

const root = fileURLToPath(new URL("..", import.meta.url));
const frontendDir = join(root, "apps", "frontend");
const distDir = join(frontendDir, "dist");
const sourceResourcePath = join(frontendDir, "ws-resources.json");
const distResourcePath = join(distDir, "ws-resources.json");

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function hasArg(name: string): boolean {
  return process.argv.includes(name);
}

function option(name: string, envName: string, fallback: string): string {
  return argValue(name) ?? process.env[envName] ?? fallback;
}

function defaultBinary(name: string): string {
  const suiupPath = join(homedir(), ".local", "bin", name);
  return existsSync(suiupPath) ? suiupPath : name;
}

function readOptions(): Options {
  return {
    context: option("--context", "WALRUS_SITE_CONTEXT", "testnet"),
    epochs: option("--epochs", "WALRUS_SITE_EPOCHS", "1"),
    objectId: argValue("--object-id") ?? process.env.WALRUS_SITE_OBJECT_ID,
    config: argValue("--config") ?? process.env.WALRUS_SITE_CONFIG,
    siteBuilder: option("--site-builder", "WALRUS_SITE_BUILDER", defaultBinary("site-builder")),
    walrusBinary: argValue("--walrus-binary") ?? process.env.WALRUS_SITE_WALRUS_BINARY ?? defaultBinary("walrus"),
    dryRun: hasArg("--dry-run") || process.env.WALRUS_SITE_DRY_RUN === "true",
    skipBuild: hasArg("--skip-build") || process.env.WALRUS_SITE_SKIP_BUILD === "true",
    allowLocalApis: hasArg("--allow-local-apis") || process.env.WALRUS_SITE_ALLOW_LOCAL_APIS === "true",
  };
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function run(command: string, args: string[]): void {
  execFileSync(command, args, {
    cwd: root,
    stdio: "inherit",
  });
}

function publicPath(path: string): string {
  return `/${relative(distDir, path).split("/").join("/")}`;
}

function staticHeaders(): Headers {
  const headers: Headers = {
    "/index.html": {
      "Cache-Control": "no-cache",
    },
  };

  function walk(dir: string): void {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (basename(path) === "ws-resources.json") {
        continue;
      }
      if (statSync(path).isDirectory()) {
        walk(path);
        continue;
      }
      const route = publicPath(path);
      if (route.startsWith("/assets/")) {
        headers[route] = {
          "Cache-Control": "public, max-age=31536000, immutable",
        };
      }
      if (extname(path) === ".wasm") {
        headers[route] = {
          ...headers[route],
          "Content-Type": "application/wasm",
        };
      }
    }
  }

  walk(distDir);
  return headers;
}

function localUrl(value: string | undefined): boolean {
  return Boolean(value && /^(http:\/\/)?(localhost|127\.0\.0\.1|\[::1\])(?::|\/|$)/.test(value));
}

function validatePublicApiUrls(options: Options): void {
  const marketplaceUrl = process.env.VITE_MARKETPLACE_API_URL;
  const disclosureHostUrl = process.env.VITE_DISCLOSURE_HOST_URL;
  const localApis = [marketplaceUrl, disclosureHostUrl].filter(localUrl);
  if (options.dryRun || options.allowLocalApis || localApis.length === 0) {
    return;
  }

  throw new Error([
    "Refusing to publish a public Walrus Site with localhost frontend API URLs.",
    `VITE_MARKETPLACE_API_URL=${marketplaceUrl ?? "(unset)"}`,
    `VITE_DISCLOSURE_HOST_URL=${disclosureHostUrl ?? "(unset)"}`,
    "Set public HTTPS API URLs or rerun with --allow-local-apis for a local-only demo.",
  ].join("\n"));
}

function prepareResources(options: Options): WalrusSiteResources {
  const resources = readJson<WalrusSiteResources>(sourceResourcePath);
  const metadata = {
    ...resources.metadata,
    ...(process.env.WALRUS_SITE_LINK ? { link: process.env.WALRUS_SITE_LINK } : {}),
  };
  const prepared = {
    ...resources,
    ...(options.objectId ? { object_id: options.objectId } : {}),
    metadata,
    headers: {
      ...staticHeaders(),
      ...resources.headers,
    },
  };
  mkdirSync(distDir, { recursive: true });
  writeJson(distResourcePath, prepared);
  return prepared;
}

function assertSiteBuilderAvailable(command: string): void {
  const result = spawnSync(command, ["--help"], {
    cwd: root,
    stdio: "ignore",
  });
  if (result.error) {
    throw new Error([
      `Could not run ${command}. Install the Walrus Sites CLI first:`,
      "  suiup install site-builder@mainnet",
      "Then rerun npm run deploy:walrus-site.",
    ].join("\n"));
  }
}

function deploy(options: Options): void {
  assertSiteBuilderAvailable(options.siteBuilder);
  const resources = readJson<WalrusSiteResources>(distResourcePath);
  const siteName = resources.metadata?.site_name;
  const args = [
    `--context=${options.context}`,
    ...(options.config ? [`--config=${options.config}`] : []),
    ...(options.walrusBinary ? [`--walrus-binary=${options.walrusBinary}`] : []),
    "deploy",
    "--epochs",
    options.epochs,
    ...(siteName ? ["--site-name", siteName] : []),
    ...(options.objectId ? ["--object-id", options.objectId] : []),
    distDir,
  ];
  run(options.siteBuilder, args);
}

function syncObjectId(): void {
  if (!existsSync(distResourcePath)) {
    return;
  }
  const deployed = readJson<WalrusSiteResources>(distResourcePath);
  if (!deployed.object_id) {
    return;
  }
  const source = readJson<WalrusSiteResources>(sourceResourcePath);
  if (source.object_id === deployed.object_id) {
    return;
  }
  writeJson(sourceResourcePath, {
    ...source,
    object_id: deployed.object_id,
  });
  console.log(`Recorded Walrus Site object ID in ${sourceResourcePath}: ${deployed.object_id}`);
}

try {
  const options = readOptions();
  validatePublicApiUrls(options);

  if (!options.skipBuild) {
    run("npm", ["run", "build", "-w", "@capsule/frontend"]);
  }
  if (!existsSync(join(distDir, "index.html"))) {
    throw new Error("Frontend dist/index.html was not found. Build the frontend before deploying.");
  }

  prepareResources(options);

  if (options.dryRun) {
    console.log("Prepared Walrus Site resources:");
    console.log(`  ${distResourcePath}`);
    console.log("Dry run command:");
    console.log([
      options.siteBuilder,
      `--context=${options.context}`,
      ...(options.config ? [`--config=${options.config}`] : []),
      ...(options.walrusBinary ? [`--walrus-binary=${options.walrusBinary}`] : []),
      "deploy",
      "--epochs",
      options.epochs,
      "--site-name",
      "Capsule",
      ...(options.objectId ? ["--object-id", options.objectId] : []),
      distDir,
    ].join(" "));
  } else {
    deploy(options);
    syncObjectId();
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
