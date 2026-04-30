import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  CalendarOff,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";

interface LeaveRequest {
  id: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedOn: string;
}

type BackendLeaveRequest = {
  id: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt?: string;
};

const mapLeave = (leave: BackendLeaveRequest): LeaveRequest => ({
  id: leave.id,
  type: leave.type,
  from: leave.fromDate,
  to: leave.toDate,
  reason: leave.reason,
  status: leave.status,
  appliedOn: leave.createdAt?.slice(0, 10) ?? leave.fromDate,
});

const statusConfig = {
  Pending: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/15",
    label: "Pending",
  },
  Approved: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/15",
    label: "Approved",
  },
  Rejected: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/15",
    label: "Rejected",
  },
};

const StudentLeave = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: "Sick Leave",
    from: "",
    to: "",
    reason: "",
  });

  const { data: leaves = [], isLoading } = useQuery({
    queryKey: ["student-leaves"],
    queryFn: async () => {
      const data = await apiAuthRequest<BackendLeaveRequest[]>(
        "/leaves/requests",
      );
      return data.map(mapLeave);
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (payload: {
      type: string;
      fromDate: string;
      toDate: string;
      reason: string;
    }) => {
      const created = await apiAuthRequest<BackendLeaveRequest>(
        "/leaves/requests",
        {
          method: "POST",
          body: JSON.stringify(payload),
        },
      );
      return mapLeave(created);
    },
    onSuccess: (newLeave) => {
      queryClient.setQueryData<LeaveRequest[]>(
        ["student-leaves"],
        (old) => [newLeave, ...(old ?? [])],
      );
      setForm({ type: "Sick Leave", from: "", to: "", reason: "" });
      setShowForm(false);
      toast.success("Leave application submitted!");
    },
    onError: (error) => {
      if (error instanceof ApiRequestError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to submit leave application.");
      }
    },
  });

  const handleSubmit = async () => {
    if (!form.from || !form.to || !form.reason) {
      toast.error("Please fill all fields!");
      return;
    }

    if (form.to < form.from) {
      toast.error("To date must be same or after from date.");
      return;
    }

    leaveMutation.mutate({
      type: form.type,
      fromDate: form.from,
      toDate: form.to,
      reason: form.reason.trim(),
    });
  };

  const isSubmitting = leaveMutation.isPending;

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarOff className="h-7 w-7 text-primary" /> Leave Requests
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Submit and track your leave applications
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shadow-sm hover:shadow-md ${
            showForm
              ? "bg-muted text-muted-foreground hover:bg-muted/80"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          <CalendarOff className="h-4 w-4" />
          {showForm ? "Cancel" : "New Application"}
        </button>
      </div>

      {/* Application Form */}
      {showForm && (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" /> Leave Application Form
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                >
                  {["Sick Leave", "Family Emergency", "Personal", "Medical Appointment", "Other"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="hidden sm:block" />
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">From Date</label>
                <input
                  type="date"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">To Date</label>
                <input
                  type="date"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                className="w-full text-sm bg-muted/30 border border-border rounded-xl px-3 py-2.5 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all resize-none"
                placeholder="Describe your reason for leave..."
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-success text-success-foreground text-sm font-medium hover:bg-success/90 transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                {isSubmitting ? "Submitting..." : "Submit Application"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Leave History */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" /> Leave History
        </h2>

        {isLoading && (
          <div className="rounded-xl border border-border/60 bg-card/50 p-5 text-sm text-muted-foreground flex items-center gap-2">
            <span className="spinner h-4 w-4" /> Loading leave history...
          </div>
        )}

        {!isLoading && leaves.length === 0 && (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
            <CalendarOff className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No leave applications found.</p>
            <p className="text-xs text-muted-foreground mt-1">Use the button above to submit a new request.</p>
          </div>
        )}

        {leaves.map((l) => {
          const cfg = statusConfig[l.status];
          const Icon = cfg.icon;
          return (
            <div
              key={l.id}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 p-5"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground text-base">{l.type}</h3>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" /> Applied: {l.appliedOn}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" /> {l.from} → {l.to}
                      </span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color} self-start`}>
                    <Icon className="h-3.5 w-3.5" /> {l.status}
                  </span>
                </div>
                <div className="mt-2 rounded-xl bg-muted/20 p-3 border border-border/40">
                  <p className="text-sm text-foreground/80">{l.reason}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentLeave;