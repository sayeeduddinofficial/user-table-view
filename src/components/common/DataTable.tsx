import { Card, CardContent } from "@/components/ui/card";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  rowKey: (row: T) => string | number;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No data found",
  pagination,
  onPageChange,
  rowKey,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <Card className="glass-panel rounded-xl">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/50">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`text-left p-4 text-sm font-medium text-muted-foreground ${column.className || ""}`}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-muted-foreground text-sm"
                  >
                    Loading...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="p-8 text-center text-muted-foreground text-sm"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                data.map((row) => (
                  <tr
                    key={rowKey(row)}
                    onClick={() => onRowClick?.(row)}
                    className={`border-b border-border/50 hover:bg-muted/20 transition-colors ${
                      onRowClick ? "cursor-pointer" : ""
                    }`}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={`p-4 text-sm ${column.className || ""}`}
                      >
                        {column.render
                          ? column.render(row)
                          : (row[column.key as keyof T] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && onPageChange && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {pagination.total === 0
                  ? 0
                  : (pagination.page - 1) * pagination.limit + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium text-foreground">
                {Math.min(pagination.page * pagination.limit, pagination.total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {pagination.total}
              </span>{" "}
              results
            </p>

            <div className="flex items-center gap-1">
              <button
                onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
                disabled={!pagination.hasPrev}
                className="px-3 h-8 rounded-md border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Prev
              </button>

              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === pagination.totalPages ||
                    Math.abs(p - pagination.page) <= 1
                )
                .map((p) => (
                  <button
                    key={p}
                    onClick={() => onPageChange(p)}
                    className={`px-3 h-8 rounded-md text-sm transition ${
                      p === pagination.page
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/50 hover:bg-muted/50"
                    }`}
                  >
                    {p}
                  </button>
                ))}

              <button
                onClick={() =>
                  onPageChange(Math.min(pagination.totalPages, pagination.page + 1))
                }
                disabled={!pagination.hasNext}
                className="px-3 h-8 rounded-md border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
