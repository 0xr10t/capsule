#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import type { DisclosureCapsule } from "@capsule/shared-types";
import {
  createAgentClient,
  fetchCapsule,
  getDocumentCommitment,
  jsonText,
  listDocuments,
  verifyCapsuleTool,
} from "./tools.js";

const client = createAgentClient();
const server = new McpServer({
  name: "capsule-agent-mcp",
  version: "0.1.0",
});

server.registerTool(
  "list_documents",
  {
    title: "List Capsule Documents",
    description: "List public Capsule marketplace commitments without fetching private content.",
    inputSchema: {
      category: z.string().optional().describe("Optional exact category filter, case-insensitive."),
      limit: z.number().int().positive().max(100).optional().describe("Maximum number of documents to return."),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async (input) => jsonText(await listDocuments(client, input)),
);

server.registerTool(
  "get_document_commitment",
  {
    title: "Get Document Commitment",
    description: "Return public Merkle, Walrus, Sui, and fragment metadata for one document.",
    inputSchema: {
      documentId: z.string().min(1).describe("Marketplace document ID or Sui Document object ID."),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async (input) => jsonText(await getDocumentCommitment(client, input)),
);

server.registerTool(
  "fetch_capsule",
  {
    title: "Fetch Capsule",
    description: "Fetch a stored Capsule record by its Walrus blob ID through the disclosure host.",
    inputSchema: {
      capsuleBlobId: z.string().min(1).describe("Walrus blob ID of a disclosure capsule or Seal delivery wrapper."),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async (input) => jsonText(await fetchCapsule(client, input)),
);

server.registerTool(
  "verify_capsule",
  {
    title: "Verify Capsule",
    description: "Verify a plaintext/decrypted capsule locally and, by default, against the host's Sui-root check. Seal-encrypted records are reported as requiring wallet decryption.",
    inputSchema: {
      capsule: z.record(z.unknown()).optional().describe("A plaintext/decrypted DisclosureCapsule JSON object."),
      capsuleBlobId: z.string().min(1).optional().describe("Optional Walrus blob ID to fetch before verification."),
      useHostAnchor: z.boolean().optional().default(true).describe("When true, ask the disclosure host to verify the Sui anchor after local proof validation."),
    },
    annotations: {
      readOnlyHint: true,
      openWorldHint: true,
    },
  },
  async (input) => jsonText(await verifyCapsuleTool(client, {
    capsule: input.capsule as DisclosureCapsule | undefined,
    capsuleBlobId: input.capsuleBlobId,
    useHostAnchor: input.useHostAnchor,
  })),
);

await server.connect(new StdioServerTransport());
