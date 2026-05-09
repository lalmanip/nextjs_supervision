import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/common/data-table";
import type { ColumnDef } from "@tanstack/react-table";

type FailedTx = {
  id: string;
  agency: string;
  provider: string;
  amount: string;
  reason: string;
  time: string;
};

const columns: ColumnDef<FailedTx>[] = [
  { accessorKey: "id", header: "Transaction ID" },
  { accessorKey: "agency", header: "Agency" },
  { accessorKey: "provider", header: "Provider" },
  { accessorKey: "amount", header: "Amount" },
  { accessorKey: "reason", header: "Reason" },
  { accessorKey: "time", header: "Time" },
];

const data: FailedTx[] = [
  {
    id: "TX-9912",
    agency: "Skyline Travels",
    provider: "Bank",
    amount: "PKR 18,450",
    reason: "Timeout",
    time: "2026-05-08 21:12",
  },
  {
    id: "TX-9920",
    agency: "Orbit Agents",
    provider: "Wallet",
    amount: "PKR 8,120",
    reason: "Insufficient balance",
    time: "2026-05-08 20:43",
  },
  {
    id: "TX-9924",
    agency: "Corporate Desk",
    provider: "Card",
    amount: "PKR 62,900",
    reason: "Declined",
    time: "2026-05-08 19:05",
  },
];

export default function FailedTransactionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Failed Transactions</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Investigate payment failures, retries, and provider errors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={data} searchPlaceholder="Search transactions..." />
        </CardContent>
      </Card>
    </div>
  );
}

