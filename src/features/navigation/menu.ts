import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  ChartColumnBig,
  CircleDollarSign,
  LayoutDashboard,
  Percent,
  ShieldCheck,
  Ticket,
} from "lucide-react";
import type { Permission } from "@/features/rbac/rbac.types";

export type MenuItem = {
  key: string;
  label: string;
  href?: string;
  icon?: LucideIcon;
  required?: Permission;
  children?: MenuItem[];
};

export const supervisionMenu: MenuItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/supervision/dashboard",
    icon: LayoutDashboard,
    required: "supervision.dashboard.view",
  },
  {
    key: "agency-balance",
    label: "Get Agency Balance",
    href: "/supervision/agency-balance",
    icon: BadgeDollarSign,
    required: "supervision.agencyBalance.view",
  },
  {
    key: "failed-transactions",
    label: "Failed Transactions",
    href: "/supervision/failed-transactions",
    icon: ShieldCheck,
    required: "supervision.failedTransactions.view",
  },
  {
    key: "setup",
    label: "Setup",
    icon: ChartColumnBig,
    children: [
      {
        key: "setup-markup",
        label: "Setup Markup",
        href: "/supervision/setup-markup",
        icon: Percent,
        required: "supervision.setupMarkup.view",
      },
      {
        key: "setup-commission",
        label: "Setup Commission",
        href: "/supervision/setup-commission",
        icon: CircleDollarSign,
        required: "supervision.setupCommission.view",
      },
      {
        key: "setup-promotions",
        label: "Setup Promotions",
        href: "/supervision/setup-promotions",
        icon: BadgeDollarSign,
        required: "supervision.setupPromotions.view",
      },
    ],
  },
  {
    key: "hold-tickets",
    label: "Hold Tickets",
    href: "/supervision/hold-tickets",
    icon: Ticket,
    required: "supervision.holdTickets.view",
  },
];

