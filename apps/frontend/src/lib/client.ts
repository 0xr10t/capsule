import { MarketplaceClient } from "@capsule/sdk-typescript";

export const capsuleClient = new MarketplaceClient(
  import.meta.env.VITE_MARKETPLACE_API_URL ?? "http://localhost:4000",
  import.meta.env.VITE_DISCLOSURE_HOST_URL ?? "http://localhost:4001",
);

