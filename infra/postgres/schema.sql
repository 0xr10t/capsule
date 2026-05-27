-- Public marketplace metadata only. The API also initializes these tables at startup.
-- Encrypted payloads remain on Walrus; plaintext and Seal keys do not enter PostgreSQL.

CREATE TABLE IF NOT EXISTS marketplace_documents (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  record JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  record JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS marketplace_purchases_document_idx
  ON marketplace_purchases (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS marketplace_capsules (
  id TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL,
  record JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS marketplace_chain_reconciliations (
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sui_object_id TEXT NOT NULL,
  status TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  transaction_digest TEXT,
  details TEXT,
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS marketplace_reconciliations_status_idx
  ON marketplace_chain_reconciliations (status, checked_at DESC);
