import { useEffect, useState } from "react";
import { CalendarOff, Send, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";
import type { Teacher } from "@/types/domain";
import { EmptyState, SectionLoader } from "@/components/ui/states";

interface LeaveRequest {
  id: string;
  type: string;
  from: string;
  to: string;
  reason: string;
  status: "Pending" | "Approved" | "Rejected";
  appliedDate: string;
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
  appliedDate: leave.createdAt?.slice(0, 10) ?? leave.fromDate,
});

interface Props {
  teacher: Teacher;
}

const TeacherLeave = ({ teacher }: Props) => {
  const [myLeaves, setMyLeaves] = useState<LeaveRequest[]>([]);
  const [studentLeaves, setStudentLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingStudents, setIsLoadingStudents] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({ type: "Sick Leave", from: "", to: "", reason: "" });

  const [activeTab, setActiveTab] = useState<"my" | "students">("my");

  useEffect(() => {
    let mounted = true;

    const loadLeaves = async () => {
      setIsLoading(true);
      try {
        const data = await apiAuthRequest<BackendLeaveRequest[]>("/leaves/requests");
        if (!mounted) return;
        setMyLeaves(data.map(mapLeave));
      } catch (error) {
        if (!mounted) return;
        if (error instanceof ApiRequestError) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load leave history.");
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    void loadLeaves();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (activeTab === "students") {
      const loadStudentLeaves = async () => {
        setIsLoadingStudents(true);
        try {
          const data = await apiAuthRequest<BackendLeaveRequest[]>("/leaves/requests?requesterRole=STUDENT");
          if (!mounted) return;
          setStudentLeaves(data.map(mapLeave));
        } catch (error) {
          if (!mounted) return;
          toast.error("Failed to load student leave requests.");
        } finally {
          if (mounted) setIsLoadingStudents(false);
        }
      };

      void loadStudentLeaves();
    }

    return () => {
      mounted = false;
    };
  }, [activeTab]);

  const handleUpdateStatus = async (id: string, status: "Approved" | "Rejected") => {
    try {
      await apiAuthRequest(`/leaves/requests/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setStudentLeaves((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
      toast.success(`Leave request ${status.toLowerCase()}`);
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  const handleMyLeaveSubmit = async () => {
    if (!form.from || !form.to || !form.reason) {
      toast.error("Please fill all fields!");
      return;
    }

    if (form.to < form.from) {
      toast.error("To date must be same or after from date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await apiAuthRequest<BackendLeaveRequest>("/leaves/requests", {
        method: "POST",
        body: JSON.stringify({
          type: form.type,
          fromDate: form.from,
          toDate: form.to,
          reason: form.reason.trim(),
        }),
      });
      setMyLeaves((prev) => [mapLeave(created), ...prev]);
      setForm({ type: "Sick Leave", from: "", to: "", reason: "" });
      toast.success("Leave application submitted!");
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to submit leave application.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusIcon = (s: string) => {
    if (s === "Approved") return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === "Rejected") return <XCircle className="h-4 w-4 text-destructive" />;
    return <Clock className="h-4 w-4 text-warning" />;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">Leave Management</h1>

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("my")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "my"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          My Leave Applications
        </button>
        <button
          onClick={() => setActiveTab("students")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "students"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Student Leave Requests
        </button>
      </div>

      {activeTab === "my" && (
        <>
          {/* Teacher's own leave form */}
          <div className="bg-card border border-border rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
              <CalendarOff className="h-4 w-4 text-primary" /> New Leave Application
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Leave Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
                >
                  {["Sick Leave", "Casual Leave", "Personal Leave", "Emergency Leave"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div />
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">From Date</label>
                <input
                  type="date"
                  value={form.from}
                  onChange={(e) => setForm({ ...form, from: e.target.value })}
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">To Date</label>
                <input
                  type="date"
                  value={form.to}
                  onChange={(e) => setForm({ ...form, to: e.target.value })}
                  className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-muted-foreground mb-1 block">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={3}
                placeholder="Describe the reason for your leave..."
                className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
              />
            </div>
            <button
              onClick={handleMyLeaveSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}{" "}
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>

          {/* Teacher's leave history */}
          <div className="bg-card border border-border rounded-xl p-5">
            <h3 className="font-semibold text-foreground mb-4">My Leave History</h3>
            <div className="space-y-3">
              {isLoading && (
                <SectionLoader
                  label="Loading leave history..."
                  className="min-h-[120px]"
                />
              )}
              {!isLoading && myLeaves.length === 0 && (
                <EmptyState
                  title="No leave applications yet"
                  description="Your submitted leave requests will appear here."
                  className="min-h-[140px]"
                />
              )}
              {myLeaves.map((l) => (
                <div key={l.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border">
                  {statusIcon(l.status)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{l.type}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        l.status === "Approved" ? "bg-success/15 text-success" :
                        l.status === "Rejected" ? "bg-destructive/15 text-destructive" :
                        "bg-warning/15 text-warning"
                      }`}>
                        {l.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {l.from} -&gt; {l.to}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{l.reason}</p>
                    <p className="text-xs text-muted-foreground mt-1">Applied: {l.appliedDate}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === "students" && (
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4">Student Leave Requests</h3>
          <div className="space-y-3">
            {isLoadingStudents && (
              <SectionLoader label="Loading requests..." className="min-h-[120px]" />
            )}
            {!isLoadingStudents && studentLeaves.length === 0 && (
              <EmptyState title="No student requests" description="There are no pending leave requests from students." className="min-h-[140px]" />
            )}
            {!isLoadingStudents && studentLeaves.map((l) => (
              <div key={l.id} className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg bg-muted/20 border border-border">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-foreground">{l.type}</p>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      l.status === "Approved" ? "bg-success/15 text-success" :
                      l.status === "Rejected" ? "bg-destructive/15 text-destructive" :
                      "bg-warning/15 text-warning"
                    }`}>
                      {l.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    Applied on: {l.appliedDate}
                  </p>
                  <div className="text-sm text-foreground bg-background p-3 rounded border border-border">
                    <p><span className="font-medium">Dates:</span> {l.from} to {l.to}</p>
                    <p className="mt-1"><span className="font-medium">Reason:</span> {l.reason}</p>
                  </div>
                </div>
                {l.status === "Pending" && (
                  <div className="flex sm:flex-col gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleUpdateStatus(l.id, "Approved")}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-success text-success-foreground rounded-lg text-sm font-medium hover:bg-success/90 transition-colors"
                    >
                      <CheckCircle className="h-4 w-4" /> Approve
                    </button>
                    <button
                      onClick={() => handleUpdateStatus(l.id, "Rejected")}
                      className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium hover:bg-destructive/90 transition-colors"
                    >
                      <XCircle className="h-4 w-4" /> Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLeave;
