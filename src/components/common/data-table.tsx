/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type Column,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowDownUp, ArrowUp, Columns2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

export type DataTableColumnMeta = {
  thClassName?: string;
  tdClassName?: string;
};

export type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  className?: string;
  searchPlaceholder?: string;
};

function columnPickerLabel<TData, TValue>(column: Column<TData, TValue>): string {
  const header = column.columnDef.header;
  if (typeof header === "string" && header.trim()) return header.trim();
  const def = column.columnDef as unknown as { accessorKey?: unknown };
  const key = def.accessorKey;
  if (typeof key === "string" && key.trim()) {
    return key
      .replace(/_/g, " ")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
  return column.id;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  className,
  searchPlaceholder = "Search...",
}: DataTableProps<TData, TValue>) {
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});

  const table = useReactTable({
    data,
    columns,
    state: { globalFilter, sorting, columnVisibility },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide());
  const visibleColumnCount = Math.max(1, table.getVisibleLeafColumns().length);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={globalFilter ?? ""}
          onChange={(e) => setGlobalFilter(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-sm"
        />
        {hideableColumns.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="gap-1.5">
                <Columns2 className="h-4 w-4" aria-hidden />
                Columns
                <ChevronDown className="h-3.5 w-3.5 opacity-60" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs font-normal text-zinc-500 dark:text-zinc-400">
                Show or hide columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-72 overflow-y-auto">
                {hideableColumns.map((column) => (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="font-normal"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {columnPickerLabel(column)}
                  </DropdownMenuCheckboxItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
        <div className="flex-1" />
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {table.getFilteredRowModel().rows.length} rows
        </div>
      </div>

      <div className="max-w-full overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-800">
        <table className="w-max min-w-full border-collapse text-sm">
          <thead className="bg-zinc-50 dark:bg-zinc-950">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-zinc-200 dark:border-zinc-800">
                {hg.headers.map((header) => {
                  const meta = header.column.columnDef.meta as DataTableColumnMeta | undefined;
                  return (
                  <th
                    key={header.id}
                    className={cn("px-3 py-2 text-left font-medium align-top", meta?.thClassName)}
                  >
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className={cn(
                          "-ml-1 inline-flex max-w-full items-center gap-1 rounded px-1 py-0.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-900",
                          header.column.getIsSorted() &&
                            "font-semibold text-zinc-900 dark:text-zinc-100"
                        )}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getIsSorted() === "asc" ? (
                          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        ) : header.column.getIsSorted() === "desc" ? (
                          <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        ) : (
                          <ArrowDownUp className="h-3.5 w-3.5 shrink-0 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-200 last:border-b-0 dark:border-zinc-800"
                >
                  {row.getVisibleCells().map((cell) => {
                    const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
                    return (
                    <td
                      key={cell.id}
                      className={cn("px-3 py-2 align-top", meta?.tdClassName)}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                    );
                  })}
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-3 py-6 text-center text-zinc-500 dark:text-zinc-400" colSpan={visibleColumnCount}>
                  No results.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}

