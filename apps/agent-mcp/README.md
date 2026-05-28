# Capsule Agent MCP

`@capsule/agent-mcp` exposes Capsule's read-only and verification surface to
AI agents through MCP over stdio.

## Tools

| Tool | Purpose |
| --- | --- |
| `list_documents` | List public marketplace commitments and high-level metadata |
| `get_document_commitment` | Inspect one document's Merkle root, Walrus blob IDs, Sui anchor, and fragments |
| `fetch_capsule` | Fetch a stored capsule or Seal delivery wrapper by Walrus blob ID |
| `verify_capsule` | Verify a plaintext/decrypted capsule locally and optionally through the disclosure host's Sui-root check |

The server does not sign purchases, spend SUI, or request Seal wallet
authorization. If `verify_capsule` is pointed at a Seal-encrypted delivery, it
reports that wallet decryption is required.

## Run

```bash
npm run build -w @capsule/agent-mcp
CAPSULE_MARKETPLACE_API_URL=http://localhost:4000 \
CAPSULE_DISCLOSURE_HOST_URL=http://localhost:4001 \
npm run start -w @capsule/agent-mcp
```

Most local MCP clients can use the package through stdio:

```json
{
  "mcpServers": {
    "capsule": {
      "command": "npm",
      "args": ["run", "mcp:agent"],
      "env": {
        "CAPSULE_MARKETPLACE_API_URL": "http://localhost:4000",
        "CAPSULE_DISCLOSURE_HOST_URL": "http://localhost:4001"
      }
    }
  }
}
```
