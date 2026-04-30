import { useEffect, useMemo, useState } from "react";
import { Bell, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiAuthRequest } from "@/lib/api";

type PasswordResetRequest = {
  id: string;
  identifier: string;
  role: "STUDENT" | "TEACHER";
  targetName: string;
  requestedAt: string;
  status: "PENDING" | "RESOLVED";
};

type ResetResponse = {
  requestId: string;
  identifier: string;
  defaultPassword: string;
  resolvedAt: string;
};

const AdminPasswordResetNotifications = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PasswordResetRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingResetId, setPendingResetId] = useState<string | null>(null);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const data = await apiAuthRequest<PasswordResetRequest[]>("/auth/password-reset-requests");
      setItems(data);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to load password reset requests.";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadRequests();
  }, [open]);

  const pendingCount = useMemo(
    () => items.filter((item) => item.status === "PENDING").length,
    [items],
  );

  const handleReset = async (requestId: string) => {
    setPendingResetId(requestId);
    try {
      const data = await apiAuthRequest<ResetResponse>(
        `/auth/password-reset-requests/${requestId}/reset`,
        { method: "POST" },
      );
      setItems((prev) => prev.filter((item) => item.id !== requestId));
      toast.success(`Password reset. Default password is ${data.defaultPassword}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to reset password right now.";
      toast.error(message);
    } finally {
      setPendingResetId(null);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative text-muted-foreground hover:text-foreground transition-colors p-2 rounded-md hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {pendingCount > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-sm">
            {pendingCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card shadow-xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <p className="text-sm font-semibold text-foreground">Password Reset Requests</p>
              <p className="text-xs text-muted-foreground">
                Pending student and teacher requests
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void loadRequests();
              }}
              className="text-xs text-primary hover:underline"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading requests...
              </div>
            ) : items.length === 0 ? (
              <div className="p-6 text-sm text-muted-foreground text-center">
                No pending password reset requests.
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="px-4 py-3 border-b border-border last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.targetName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.role === "TEACHER" ? "Teacher" : "Student"} ID: {item.identifier}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested {new Date(item.requestedAt).toLocaleString("en-PK")}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pendingResetId === item.id}
                      onClick={() => {
                        void handleReset(item.id);
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs text-primary-foreground disabled:opacity-60"
                    >
                      {pendingResetId === item.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <KeyRound className="h-3.5 w-3.5" />
                      )}
                      Reset
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPasswordResetNotifications;
