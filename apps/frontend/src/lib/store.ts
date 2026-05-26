import type { StoredCapsule } from "@capsule/shared-types";
import { create } from "zustand";

export type Page = "marketplace" | "upload" | "viewer" | "explorer";

interface CapsuleState {
  page: Page;
  selectedCapsule?: StoredCapsule;
  selectCapsule: (capsule: StoredCapsule) => void;
  navigate: (page: Page) => void;
}

export const useCapsuleStore = create<CapsuleState>((set) => ({
  page: "marketplace",
  navigate: (page) => set({ page }),
  selectCapsule: (selectedCapsule) => set({ selectedCapsule, page: "viewer" }),
}));

