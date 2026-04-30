import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  BookOpen,
  FilterX,
} from "lucide-react";
import type { PortalStudent } from "../../types";
import { apiAuthRequest } from "@/lib/api";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

interface Props {
  student: PortalStudent;
}

type BackendAttendanceItem = {
  sessionId: string;
  className: string;
  date: string;
  time: string;
  status?: AttendanceStatus;
  teacherName: string;
};

type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";
interface DayRecord {
  date: string;
  day: string;
  status: AttendanceStatus;
  subject: string;
}

const statusConfig = {
  Present: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/15",
    border: "border-success/30",
    lightBg: "bg-success/5",
  },
  Absent: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/15",
    border: "border-destructive/30",
    lightBg: "bg-destructive/5",
  },
  Late: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/15",
    border: "border-warning/30",
    lightBg: "bg-warning/5",
  },
  Leave: {
    icon: Calendar,
    color: "text-info",
    bg: "bg-info/15",
    border: "border-info/30",
    lightBg: "bg-info/5",
  },
};

const COLORS = {
  Present: "hsl(var(--success))",
  Absent: "hsl(var(--destructive))",
  Late: "hsl(var(--warning))",
  Leave: "hsl(var(--info))",
};

const StudentAttendance = ({ student }: Props) => {
  const [statusFilter, setStatusFilter] = useState<AttendanceStatus | null>(
    null,
  );
  const [courseFilter, setCourseFilter] = useState<string | null>(null);

  const { data: backendLog = [], isLoading } = useQuery({
    queryKey: ["student-attendance-data", student.id],
    queryFn: async () => {
      const records = await apiAuthRequest<BackendAttendanceItem[]>(
        `/attendance/students/${encodeURIComponent(student.id)}`,
      );

      const mapped = records.map((record) => ({
        date: record.date,
        day: new Date(record.date).toLocaleDateString("en-US", {
          weekday: "short",
        }),
        status: (record.status as AttendanceStatus) ?? "Absent",
        subject: record.className,
      }));

      return mapped.sort((a, b) => b.date.localeCompare(a.date));
    },
    enabled: !!student.id,
  });

  const log = backendLog;

  const subjects = useMemo(
    () => Array.from(new Set(log.map((item) => item.subject))).filter(Boolean),
    [log],
  );

  const counts = useMemo(
    () =>
      log.reduce(
        (acc, item) => {
          acc[item.status] += 1;
          return acc;
        },
        { Present: 0, Absent: 0, Late: 0, Leave: 0 } as Record<
          AttendanceStatus,
          number
        >,
      ),
    [log],
  );

  const totalDays = log.length || 1;
  const attPct = ((counts.Present / totalDays) * 100).toFixed(0);

  const chartData = [
    { name: "Present", value: counts.Present },
    { name: "Absent", value: counts.Absent },
    { name: "Late", value: counts.Late },
    { name: "Leave", value: counts.Leave },
  ];

  // Apply filters
  const filteredLog = useMemo(() => {
    let filtered = log;
    if (statusFilter) {
      filtered = filtered.filter((r) => r.status === statusFilter);
    }
    if (courseFilter) {
      filtered = filtered.filter((r) => r.subject === courseFilter);
    }
    return filtered;
  }, [log, statusFilter, courseFilter]);

  const cards: { label: AttendanceStatus; value: number }[] = [
    { label: "Present", value: counts.Present },
    { label: "Absent", value: counts.Absent },
    { label: "Late", value: counts.Late },
    { label: "Leave", value: counts.Leave },
  ];

  if (log.length === 0 && !isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <Calendar className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No Attendance Records</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
          Your teachers have not uploaded any attendance records for you yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6">
      {/* Header with filter reset */}
      <div className="flex items-center justify-between mb-0">
        {isLoading && (
          <span className="text-sm text-muted-foreground flex items-center gap-2">
            <span className="spinner h-4 w-4" />Loading attendance...
          </span>
        )}
        {(statusFilter || courseFilter) && (
          <button
            onClick={() => {
              setStatusFilter(null);
              setCourseFilter(null);
            }}
            className="inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors"
          >
            <FilterX className="h-4 w-4" /> Clear all filters
          </button>
        )}
      </div>

      {/* Attendance Chart with integrated rate - Enhanced card */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Attendance Distribution
          </h2>
        </div>
        <div className="h-72 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                outerRadius={100}
                innerRadius={60}
                paddingAngle={4}
                label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                }
                labelLine={false}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[entry.name as keyof typeof COLORS]}
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                    className="transition-opacity hover:opacity-80"
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  boxShadow: "0 10px 25px -5px rgb(0 0 0 / 0.1)",
                  padding: "8px 12px",
                  color: "hsl(var(--foreground))",
                }}
                labelStyle={{
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                }}
                formatter={(value, name) => [`${value} days`, name]}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-sm text-muted-foreground">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Overall rate centered inside donut */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
            <p className="text-3xl font-bold text-primary">{attPct}%</p>
            <p className="text-xs text-muted-foreground">Overall</p>
          </div>
        </div>
      </div>

      {/* Summary Cards (Present, Absent, Late, Leave) - Enhanced */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-0">
        {cards.map((item) => {
          const cfg = statusConfig[item.label];
          const isActive = statusFilter === item.label;
          return (
            <button
              key={item.label}
              onClick={() => setStatusFilter(isActive ? null : item.label)}
              className={`group relative overflow-hidden rounded-2xl p-5 text-center transition-all duration-300 hover:-translate-y-1 ${isActive
                  ? "bg-card border-2 shadow-lg"
                  : "bg-card border border-border/60 hover:border-primary/30 shadow-sm"
                }`}
            >
              <div
                className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity ${cfg.lightBg}`}
                aria-hidden="true"
              />
              <div className="relative">
                <div
                  className={`h-14 w-14 rounded-full ${cfg.bg} flex items-center justify-center mx-auto mb-3 transition-transform group-hover:scale-110`}
                >
                  <cfg.icon className={`h-7 w-7 ${cfg.color}`} />
                </div>
                <p className="text-3xl font-bold text-foreground">
                  {item.value}
                </p>
                <p className="text-sm font-medium text-muted-foreground mt-1">
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  out of {log.length} days
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Course Filter Bar - Enhanced */}
      {subjects.length > 0 && (
        <div className="rounded-xl bg-card border border-border/60 p-4 mb-0">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Filter by Course
          </h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCourseFilter(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${courseFilter === null
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
                }`}
            >
              All Courses
            </button>
            {subjects.map((subject) => (
              <button
                key={subject}
                onClick={() => setCourseFilter(subject)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${courseFilter === subject
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:bg-muted"
                  }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Day Log - Enhanced */}
      {filteredLog.length > 0 ? (
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
          <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between bg-muted/5">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              {statusFilter && (
                <span
                  className={`h-3 w-3 rounded-full ${statusFilter === "Present"
                      ? "bg-success"
                      : statusFilter === "Absent"
                        ? "bg-destructive"
                        : statusFilter === "Late"
                          ? "bg-warning"
                          : "bg-info"
                    }`}
                />
              )}
              <span>
                {statusFilter ? `${statusFilter} Days` : "All Days"}
                {courseFilter && ` – ${courseFilter}`}
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                ({filteredLog.length} record{filteredLog.length !== 1 ? 's' : ''})
              </span>
            </h3>
            <span className="text-xs text-muted-foreground">
              Sorted by date
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto scrollbar-thin">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card z-10">
                <tr className="border-b border-border/80 bg-muted/5">
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                    #
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                    Day
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                    Course
                  </th>
                  <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide px-5 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filteredLog.map((r, i) => {
                  const cfg = statusConfig[r.status];
                  return (
                    <tr
                      key={i}
                      className="hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-5 py-3 text-xs text-muted-foreground">
                        {i + 1}
                      </td>
                      <td className="px-5 py-3 text-foreground font-medium tabular-nums">
                        {new Date(r.date).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">
                        {r.day}
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {r.subject}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${cfg.bg} ${cfg.color}`}
                        >
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border/60 p-8 text-center">
          <p className="text-muted-foreground">
            No attendance records match the selected filters.
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;