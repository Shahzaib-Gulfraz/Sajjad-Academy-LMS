import type { Student } from "@/types/domain";
import type { AttendanceRecord, AttendanceStatus } from "../types/attendance";
import { statusConfig } from "../utils/constants";

type Props = {
  selectedStudent: Student;
  subjectOptions: string[];
  activeSubjectFilter: string;
  onSubjectFilterChange: (value: string) => void;
  statusCounts: Record<AttendanceStatus, number>;
  activeStatusFilter: AttendanceStatus | null;
  onStatusFilterChange: (status: AttendanceStatus | null) => void;
  visibleRecords: AttendanceRecord[];
  subjectFilteredTotal: number;
  onClose: () => void;
  onUpdateRecordStatus: (recordId: string, status: AttendanceStatus) => void;
};

const AttendanceDetails = ({
  selectedStudent,
  subjectOptions,
  activeSubjectFilter,
  onSubjectFilterChange,
  statusCounts,
  activeStatusFilter,
  onStatusFilterChange,
  visibleRecords,
  subjectFilteredTotal,
  onClose,
  onUpdateRecordStatus,
}: Props) => {
  return (
    <div className="mt-8 rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-lg font-semibold text-foreground">
            {selectedStudent.name} Attendance Records
          </p>
          <p className="text-xs text-muted-foreground">
            ID {selectedStudent.id} · Class {selectedStudent.grade}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-semibold text-primary hover:underline"
        >
          Close
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {subjectOptions.map((subject) => (
          <button
            key={subject}
            type="button"
            onClick={() => {
              onSubjectFilterChange(subject);
              onStatusFilterChange(null);
            }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
              activeSubjectFilter === subject
                ? "border-primary/60 bg-primary/10 text-primary"
                : "border-border bg-background text-foreground"
            }`}
          >
            {subject}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => {
          const cfg = statusConfig[status];
          const isActive = activeStatusFilter === status;
          const Icon = cfg.icon;
          return (
            <button
              key={status}
              type="button"
              onClick={() => onStatusFilterChange(status)}
              className={`rounded-xl border bg-background p-4 text-left transition ${
                isActive ? `${cfg.border} border-2` : "border-border"
              }`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-full ${cfg.bg}`}>
                <Icon className={`h-5 w-5 ${cfg.color}`} />
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {statusCounts[status]}
              </p>
              <p className="text-xs text-muted-foreground">{status}</p>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <p>
          Showing {visibleRecords.length} of {subjectFilteredTotal} records
          {activeStatusFilter ? ` (${activeStatusFilter})` : ""}.
        </p>
        {activeStatusFilter && (
          <button
            type="button"
            onClick={() => onStatusFilterChange(null)}
            className="text-xs font-semibold text-primary hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-border">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-card">
              {["Date", "Day", "Time", "Class", "Status", "Change"].map((header) => (
                <th
                  key={header}
                  className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRecords.map((record) => {
              const cfg = statusConfig[record.status];
              return (
                <tr
                  key={record.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-2 text-sm text-foreground">{record.date}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{record.day}</td>
                  <td className="px-4 py-2 text-sm text-muted-foreground">{record.time}</td>
                  <td className="px-4 py-2 text-sm text-foreground">{record.className}</td>
                  <td className="px-4 py-2 text-sm">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                    >
                      {record.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <select
                      value={record.status}
                      onChange={(event) =>
                        onUpdateRecordStatus(
                          record.id,
                          event.target.value as AttendanceStatus,
                        )
                      }
                      className="h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground"
                    >
                      {(Object.keys(statusConfig) as AttendanceStatus[]).map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AttendanceDetails;
