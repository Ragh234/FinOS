"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, LoadingState } from "./states";

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  width?: string;
};

export function DataTable<T>({
  rows,
  columns,
  isLoading,
  error,
  search,
  onSearch,
  emptyTitle = "No records found"
}: {
  rows?: T[];
  columns: Column<T>[];
  isLoading?: boolean;
  error?: unknown;
  search?: string;
  onSearch?: (value: string) => void;
  emptyTitle?: string;
}) {
  return (
    <div className="rounded-md border border-border bg-white">
      {onSearch ? (
        <div className="flex items-center gap-2 border-b border-border p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input className="max-w-sm" placeholder="Search records" value={search ?? ""} onChange={(event) => onSearch(event.target.value)} />
        </div>
      ) : null}
      {isLoading ? <LoadingState /> : error ? <ErrorState error={error} /> : !rows?.length ? <EmptyState title={emptyTitle} /> : (
        <div className="overflow-auto">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/70 text-left text-xs uppercase text-muted-foreground">
                {columns.map((column) => (
                  <th key={column.key} className="h-9 px-3 font-semibold" style={{ width: column.width }}>
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={index} className="border-b border-border last:border-0 hover:bg-accent/70">
                  {columns.map((column) => (
                    <td key={column.key} className="h-11 px-3 align-middle">
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="flex h-10 items-center justify-between border-t border-border px-3 text-xs text-muted-foreground">
        <span>{rows?.length ?? 0} shown</span>
        <span>Pagination ready</span>
      </div>
    </div>
  );
}
