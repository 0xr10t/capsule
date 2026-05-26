CREATE TABLE publishers (
  address TEXT PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE documents (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  publisher_address TEXT NOT NULL REFERENCES publishers(address),
  category TEXT NOT NULL,
  line_count INTEGER NOT NULL CHECK (line_count > 0),
  root_hash CHAR(64) NOT NULL,
  walrus_blob_id TEXT NOT NULL,
  sui_document_id TEXT,
  price_per_line_mist NUMERIC(40, 0) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE sections (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  price_mist NUMERIC(40, 0) NOT NULL,
  CHECK (line_start >= 0 AND line_start <= line_end)
);

CREATE TABLE purchases (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  buyer_address TEXT NOT NULL,
  line_start INTEGER NOT NULL,
  line_end INTEGER NOT NULL,
  amount_mist NUMERIC(40, 0) NOT NULL,
  payment_tx TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE capsules (
  id UUID PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES documents(id),
  purchase_id UUID REFERENCES purchases(id),
  walrus_blob_id TEXT NOT NULL,
  root_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL
);
