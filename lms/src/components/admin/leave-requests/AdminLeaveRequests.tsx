import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";

type LeaveStatus = "Pending" | "Approved" | "Rejected";

type LeaveRequest = {
  id: string;
  personType: "Student" | "Teacher";
  personName: string;
  leaveType: string;
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
};

type BackendLeaveRequest = {
  id: string;
  requesterUserId: string;
  requesterRole: "ADMIN" | "TEACHER" | "STUDENT";
  requesterName?: string;
  type: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveStatus;
};

const badge = (status: LeaveStatus) =>
  ({
    Approved: "bg-success/15 text-success",
    Pending: "bg-warning/15 text-warning",
    Rejected: "bg-destructive/15 text-destructive",
  }[status]);

const mapLeaveRequest = (request: BackendLeaveRequest): LeaveRequest => ({
  id: request.id,
  personType: request.requesterRole === "TEACHER" ? "Teacher" : "Student",
  personName: request.requesterName || request.requesterUserId,
  leaveType: request.type,
  from: request.fromDate,
  to: request.toDate,
  reason: request.reason,
  status: request.status,
  appliedOn: request.fromDate,
});

interface Props {
  onPendingCountChange?: (count: number) => void;
}

const AdminLeaveRequests = ({ onPendingCountChange }: Props) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeType, setActiveType] = useState<"All" | "Student" | "Teacher">("All");

  useEffect(() => {
    const loadLeaveRequests = async () => {
      setIsLoading(true);
      try {
        const response = await apiAuthRequest<BackendLeaveRequest[]>("/leaves/requests");
        setLeaveRequests(response.map(mapLeaveRequest));
      } catch (error) {
        if (error instanceof ApiRequestError) {
          toast.error(error.message);
        } else {
          toast.error("Failed to load leave requests.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    void loadLeaveRequests();
  }, []);

  useEffect(() => {
    onPendingCountChange?.(leaveRequests.filter((x) => x.status === "Pending").length);
  }, [leaveRequests, onPendingCountChange]);

  const updateStatus = async (id: string, status: "Approved" | "Rejected") => {
    try {
      const updated = await apiAuthRequest<BackendLeaveRequest>(
        `/leaves/requests/${id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );
      setLeaveRequests((prev) =>
        prev.map((item) => (item.id === id ? mapLeaveRequest(updated) : item))
      );
      toast.success(`Leave ${status.toLowerCase()}.`);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to update leave status.");
      }
    }
  };

  const filteredLeaves =
    activeType === "All"
      ? leaveRequests
      : leaveRequests.filter((l) => l.personType === activeType);

  const pendingCounts = leaveRequests.reduce(
    (acc, leave) => {
      if (leave.status !== "Pending") return acc;
      if (leave.personType === "Student") acc.students += 1;
      if (leave.personType === "Teacher") acc.teachers += 1;
      return acc;
    },
    { students: 0, teachers: 0 }
  );

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-5">Leave Requests</h1>
      <div className="flex flex-wrap gap-2 mb-4">
        {(["All", "Student", "Teacher"] as const).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              activeType === type
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-background text-foreground"
            }`}
          >
            {type}
            {type === "Student" && pendingCounts.students > 0
              ? ` (${pendingCounts.students})`
              : ""}
            {type === "Teacher" && pendingCounts.teachers > 0
              ? ` (${pendingCounts.teachers})`
              : ""}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {["Person", "Type", "Duration", "Reason", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-2 text-left text-xs text-muted-foreground">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="px-4 py-4 text-sm text-muted-foreground" colSpan={6}>
                  Loading leave requests...
                </td>
              </tr>
            ) : filteredLeaves.length === 0 ? (
              <tr>
                <td className="px-4 py-4 text-sm text-muted-foreground" colSpan={6}>
                  No leave requests found.
                </td>
              </tr>
            ) : (
              filteredLeaves.map((l) => (
              <tr key={l.id} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-sm">
                  {l.personName}
                  <p className="text-xs text-muted-foreground">{l.personType}</p>
                </td>
                <td className="px-4 py-2 text-sm">{l.leaveType}</td>
                <td className="px-4 py-2 text-sm text-muted-foreground">
                  {l.from} to {l.to}
                </td>
                <td className="px-4 py-2 text-sm">{l.reason}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${badge(l.status)}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateStatus(l.id, "Approved")}
                      disabled={l.status !== "Pending"}
                      className="px-2 py-1 rounded bg-success text-success-foreground text-xs"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => updateStatus(l.id, "Rejected")}
                      disabled={l.status !== "Pending"}
                      className="px-2 py-1 rounded bg-destructive text-destructive-foreground text-xs"
                    >
                      Deny
                    </button>
                  </div>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminLeaveRequests;
