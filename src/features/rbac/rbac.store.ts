import { create } from "zustand";
import type { Permission, Role } from "@/features/rbac/rbac.types";

type RbacState = {
  role: Role;
  permissions: Set<Permission>;
  setPermissions: (permissions: Permission[]) => void;
  has: (permission: Permission) => boolean;
};

const DEFAULT_PERMISSIONS: Permission[] = [
  "supervision.dashboard.view",
  "supervision.agencyBalance.view",
  "supervision.failedTransactions.view",
  "supervision.holdTickets.view",
  "supervision.cancelledTickets.view",
  "supervision.b2cEnquiries.view",
  "supervision.setupMarkup.view",
  "supervision.setupCommission.view",
  "supervision.setupPromotions.view",
];

export const useRbacStore = create<RbacState>((set, get) => ({
  role: "SUPERADMIN",
  permissions: new Set(DEFAULT_PERMISSIONS),
  setPermissions: (permissions) => set({ permissions: new Set(permissions) }),
  has: (permission) => get().permissions.has(permission),
}));

