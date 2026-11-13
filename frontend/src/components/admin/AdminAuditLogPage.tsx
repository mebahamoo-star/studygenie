import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/lib/api/services";
import type { AdminAuditLogDto } from "@/lib/api/types";
import { useApp } from "@/lib/app-state";

export default function AdminAuditLogPage() {
  const { lang } = useApp();

  const [page, setPage] = useState(0);
  const [actionFilter, setActionFilter] = useState("");
  const [targetTypeFilter, setTargetTypeFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<AdminAuditLogDto | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "admin",
      "audit-log",
      { page, size: 20, action: actionFilter, targetType: targetTypeFilter, search: searchQuery },
    ],
    queryFn: () =>
      adminService.getAuditLogs({
        page,
        size: 20,
        action: actionFilter || undefined,
        targetType: targetTypeFilter || undefined,
        search: searchQuery || undefined,
      }),
    staleTime: 10_000,
  });

  return (
    <div className="space-y-6" data-testid="admin-audit-log-page">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          {lang === "ar" ? "سجل التدقيق الأمني" : "Security Audit Log"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "سجل غير قابل للتعديل أو الحذف لجميع العمليات الإدارية."
            : "Append-only immutable audit trail of all administrator and moderator actions."}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setSearchQuery(searchInput.trim());
          }}
          className="flex min-w-[240px] flex-1 items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={lang === "ar" ? "بحث في السجل..." : "Search action, target, or JSON..."}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            {lang === "ar" ? "بحث" : "Search"}
          </Button>
        </form>

        <select
          aria-label="Filter by target type"
          value={targetTypeFilter}
          onChange={(e) => {
            setTargetTypeFilter(e.target.value);
            setPage(0);
          }}
          className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
        >
          <option value="">All Target Types</option>
          <option value="STUDENT">STUDENT</option>
          <option value="COURSE">COURSE</option>
          <option value="COURSE_REPORT">COURSE_REPORT</option>
          <option value="COURSE_TOPIC">COURSE_TOPIC</option>
          <option value="UNIVERSITY">UNIVERSITY</option>
          <option value="COLLEGE">COLLEGE</option>
        </select>

        <Input
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(0);
          }}
          placeholder="Action (e.g. UPDATE_USER_ROLE)"
          className="h-9 w-52 text-xs"
        />
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center text-sm text-destructive">
            Failed to load audit log entries.
          </div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-bold">No audit entries found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((item) => (
                  <tr key={item.id} className="transition hover:bg-muted/30">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString() : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <div className="font-bold text-foreground">{item.adminEmail || "Admin"}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {item.adminId ? item.adminId.slice(0, 8) : "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-md bg-primary/10 px-2 py-1 font-mono text-xs font-bold text-primary">
                        {item.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="font-bold">{item.targetType}</span>
                      {item.targetId && (
                        <span className="ml-1.5 font-mono text-muted-foreground">
                          ({item.targetId.slice(0, 8)})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {item.ipAddress || "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedEntry(item)}
                        className="gap-1 text-xs"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        Inspect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
            <span>
              Page {data.page + 1} of {data.totalPages} ({data.totalElements} entries)
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data.hasNext}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Audit Entry Diff Modal */}
      <Dialog
        open={Boolean(selectedEntry)}
        onOpenChange={(open) => {
          if (!open) setSelectedEntry(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-base">
                  {selectedEntry.action} · {selectedEntry.targetType}
                </DialogTitle>
                <DialogDescription>
                  Actor: {selectedEntry.adminEmail || selectedEntry.adminId} · IP:{" "}
                  {selectedEntry.ipAddress || "—"} ·{" "}
                  {selectedEntry.createdAt
                    ? new Date(selectedEntry.createdAt).toLocaleString()
                    : ""}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase text-muted-foreground">
                    Before State
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
                    {selectedEntry.beforeState || "null"}
                  </pre>
                </div>
                <div className="space-y-1.5">
                  <div className="text-xs font-bold uppercase text-muted-foreground">
                    After State
                  </div>
                  <pre className="max-h-64 overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-xs text-foreground">
                    {selectedEntry.afterState || "null"}
                  </pre>
                </div>
              </div>

              {selectedEntry.userAgent && (
                <div className="rounded-xl bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  UA: {selectedEntry.userAgent}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
