import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  ChartColumnBig,
  CircleDollarSign,
  LayoutDashboard,
  Percent,
  ShieldCheck,
  Inbox,
  MessageSquare,
  Ticket,
  TicketX,
  Palmtree,
  PlusCircle,
  Pencil,
  TreePalm,
  Users,
  UserPlus,
  Wallet,
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
  {
    key: "cancelled-tickets",
    label: "Cancelled Tickets",
    href: "/supervision/cancelled-tickets",
    icon: TicketX,
    required: "supervision.cancelledTickets.view",
  },
  {
    key: "agent",
    label: "Agent",
    icon: Users,
    children: [
      {
        key: "agent-new-registration",
        label: "New Registration",
        href: "/supervision/agent/new-registration",
        icon: UserPlus,
        required: "supervision.agent.newRegistration.view",
      },
      {
        key: "agent-top-up-request",
        label: "Pending Request",
        href: "/supervision/agent/top-up-request",
        icon: Wallet,
        required: "supervision.agent.topUpRequest.view",
      },
    ],
  },
  {
    key: "enquiry",
    label: "Enquiry",
    icon: Inbox,
    children: [
      {
        key: "b2c-enquiry",
        label: "B2C Enquiry",
        href: "/supervision/b2c-enquiries",
        icon: MessageSquare,
        required: "supervision.b2cEnquiries.view",
      },
      {
        key: "holidays-enquiry",
        label: "Holidays Enquiry",
        href: "/supervision/holidays-enquiries",
        icon: TreePalm,
        required: "supervision.holidaysEnquiries.view",
      },
    ],
  },
  {
    key: "holidays",
    label: "Holidays",
    icon: Palmtree,
    children: [
      {
        key: "holidays-create-package",
        label: "Create Package",
        href: "/supervision/holidays/create-package",
        icon: PlusCircle,
        required: "supervision.holidays.createPackage.view",
      },
      {
        key: "holidays-update-package",
        label: "Update Package",
        href: "/supervision/holidays/update-package",
        icon: Pencil,
        required: "supervision.holidays.updatePackage.view",
      },
    ],
  },
];

