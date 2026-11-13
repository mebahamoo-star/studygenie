import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Flame,
  KeyRound,
  Search,
  Shield,
  Star,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { adminService } from "@/lib/api/services";
import type { AccountStatus, AdminUserDto, UserRole } from "@/lib/api/types";
import { useApp } from "@/lib/app-state";
import { cn } from "@/lib/utils";

const ROLE_BADGE: Record<UserRole, string> = {
  ADMIN: "border-primary/40 bg-primary/15 text-primary",
  MODERATOR: "border-sky-500/30 bg-sky-500/15 text-sky-600 dark:text-sky-400",
  STUDENT: "border-border bg-muted text-muted-foreground",
};

export default function AdminUsersPage() {
  const { lang, user: currentAdmin } = useApp();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [statusFilter, setStatusFilter] = useState<AccountStatus | "">("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserDto | null>(null);
  const [selectedRole, setSelectedRole] = useState<UserRole>("STUDENT");

  const { data, isLoading, isError } = useQuery({
    queryKey: [
      "admin",
      "users",
      { page, size: 15, role: roleFilter, status: statusFilter, search: searchQuery },
    ],
    queryFn: () =>
      adminService.getUsers({
        page,
        size: 15,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      }),
    staleTime: 15_000,
  });

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) =>
      adminService.updateUserRole(userId, role),
    onSuccess: (updated) => {
      toast.success(`Role updated to ${updated.role}`);
      setSelectedUser(updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not update user role"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: AccountStatus }) =>
      adminService.updateUserStatus(userId, status),
    onSuccess: (updated) => {
      toast.success(`Account status set to ${updated.status}`);
      setSelectedUser(updated);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] });
    },
    onError: (err: Error) => toast.error(err.message || "Could not update account status"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => adminService.triggerPasswordReset(userId),
    onSuccess: (res) => {
      toast.success(res.message || "Password reset email triggered");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to trigger password reset"),
  });

  const isSelf = selectedUser && currentAdmin && selectedUser.id === currentAdmin.id;

  return (
    <div className="space-y-6" data-testid="admin-users-page">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">
          {lang === "ar" ? "إدارة المستخدمين والصلاحيات" : "Users & Role Management"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {lang === "ar"
            ? "إدارة حسابات الطلاب والمشرفين، الصلاحيات، وحالة الحساب."
            : "Inspect student accounts, assign moderator/admin roles, or suspend compromised accounts."}
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
              placeholder={lang === "ar" ? "بحث بالاسم أو البريد..." : "Search name or email..."}
              className="pl-9"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            {lang === "ar" ? "بحث" : "Search"}
          </Button>
        </form>

        <select
          aria-label="Filter by role"
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value as UserRole | "");
            setPage(0);
          }}
          className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
        >
          <option value="">{lang === "ar" ? "كل الأدوار" : "All Roles"}</option>
          <option value="STUDENT">STUDENT</option>
          <option value="MODERATOR">MODERATOR</option>
          <option value="ADMIN">ADMIN</option>
        </select>

        <select
          aria-label="Filter by status"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as AccountStatus | "");
            setPage(0);
          }}
          className="h-9 rounded-xl border border-input bg-background px-3 text-xs font-semibold"
        >
          <option value="">{lang === "ar" ? "كل الحالات" : "All Statuses"}</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="SUSPENDED">SUSPENDED</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        {isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" />
            ))}
          </div>
        ) : isError || !data ? (
          <div className="p-8 text-center text-sm text-destructive">Failed to load users list.</div>
        ) : data.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 p-12 text-center">
            <Users className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-base font-bold">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/40 text-xs font-bold uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">University</th>
                  <th className="px-4 py-3">Courses / Points</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((u) => (
                  <tr key={u.id} className="transition hover:bg-muted/30">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-foreground">{u.fullName}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          ROLE_BADGE[u.role],
                        )}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                          u.status === "SUSPENDED"
                            ? "border-destructive/40 bg-destructive/15 text-destructive"
                            : "border-emerald-500/30 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-muted-foreground">
                      {u.universityName || "—"}
                    </td>
                    <td className="px-4 py-3.5 text-xs">
                      <span className="font-bold">{u.enrolledCoursesCount}</span> courses ·{" "}
                      <span className="font-bold text-primary">{u.geniePoints}</span> pts
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedUser(u);
                          setSelectedRole(u.role);
                        }}
                        className="rounded-xl text-xs"
                      >
                        Manage
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
              Page {data.page + 1} of {data.totalPages} ({data.totalElements} users)
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

      {/* User Detail Dialog */}
      <Dialog
        open={Boolean(selectedUser)}
        onOpenChange={(open) => {
          if (!open) setSelectedUser(null);
        }}
      >
        <DialogContent className="max-w-lg">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span>{selectedUser.fullName}</span>
                </DialogTitle>
                <DialogDescription>{selectedUser.email}</DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-2">
                <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-muted/30 p-3 text-center text-xs">
                  <div>
                    <div className="text-muted-foreground">Enrolled</div>
                    <div className="mt-1 text-base font-extrabold">
                      {selectedUser.enrolledCoursesCount}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Star className="h-3.5 w-3.5 text-gold" /> Points
                    </div>
                    <div className="mt-1 text-base font-extrabold">{selectedUser.geniePoints}</div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1 text-muted-foreground">
                      <Flame className="h-3.5 w-3.5 text-gold" /> Streak
                    </div>
                    <div className="mt-1 text-base font-extrabold">
                      {selectedUser.streakCount}d (max {selectedUser.longestStreakDays}d)
                    </div>
                  </div>
                </div>

                {isSelf && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs font-semibold text-amber-600 dark:text-amber-400">
                    Self-protection active: You cannot demote or suspend your own administrator
                    account.
                  </div>
                )}

                {/* Role selector */}
                <div className="space-y-2">
                  <Label>Role Assignment</Label>
                  <div className="flex items-center gap-2">
                    <select
                      aria-label="Select user role"
                      disabled={Boolean(isSelf) || roleMutation.isPending}
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                      className="h-9 flex-1 rounded-xl border border-input bg-background px-3 text-xs font-bold"
                    >
                      <option value="STUDENT">STUDENT</option>
                      <option value="MODERATOR">MODERATOR</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                    <Button
                      size="sm"
                      disabled={
                        Boolean(isSelf) ||
                        selectedRole === selectedUser.role ||
                        roleMutation.isPending
                      }
                      onClick={() =>
                        roleMutation.mutate({
                          userId: selectedUser.id,
                          role: selectedRole,
                        })
                      }
                    >
                      Update Role
                    </Button>
                  </div>
                </div>

                {/* Account Status & Password Reset */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resetPasswordMutation.isPending}
                    onClick={() => resetPasswordMutation.mutate(selectedUser.id)}
                    className="gap-1.5 rounded-xl text-xs"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Send Password Reset
                  </Button>

                  {selectedUser.status === "ACTIVE" ? (
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={Boolean(isSelf) || statusMutation.isPending}
                      className="gap-1.5 rounded-xl text-xs"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Are you sure you want to suspend user "${selectedUser.fullName || selectedUser.email}"?`,
                          )
                        ) {
                          statusMutation.mutate({
                            userId: selectedUser.id,
                            status: "SUSPENDED",
                          });
                        }
                      }}
                    >
                      <Ban className="h-3.5 w-3.5" />
                      Suspend Account
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      disabled={statusMutation.isPending}
                      onClick={() =>
                        statusMutation.mutate({
                          userId: selectedUser.id,
                          status: "ACTIVE",
                        })
                      }
                      className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Reactivate Account
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
