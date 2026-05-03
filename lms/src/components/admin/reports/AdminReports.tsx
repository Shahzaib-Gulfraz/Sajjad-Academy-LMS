import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  GraduationCap,
  Wallet,
  TrendingUp,
  Calendar,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";
import { percentageToCambridgeGrade } from "@/lib/grades";
import { EmptyState, SectionLoader } from "@/components/ui/states";



type BackendReportsOverview = {
  summary: {
    totalStudents: number;
    totalTeachers: number;
    totalCollected: number;
    totalPending: number;
    totalInvoiced: number;
    collectionRate: number;
    avgAttendance: number;
  };
  monthlyCollection: { month: string; amount: number }[];
  pendingDuesByClass: { className: string; students: number; pending: number }[];
  teacherWorkload: { id: string; name: string; loadUnits: number }[];
  attendanceTrends: { className: string; percentage: number; present: number; total: number }[];
  gradeDistribution: { grade: string; count: number }[];
  meta: { generatedAt: string };
};

type BackendClass = {
  id: string;
  name: string;
};

const COLORS = ["hsl(var(--primary))", "#82ca9d", "#ffc658", "#ff8042", "#8884d8"];

const AdminReports = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<BackendReportsOverview | null>(null);
  const [activeClassNames, setActiveClassNames] = useState<string[]>([]);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        setIsLoading(true);
        const [response, classes] = await Promise.all([
          apiAuthRequest<BackendReportsOverview>("/reports/overview"),
          apiAuthRequest<BackendClass[]>("/classes").catch(() => []),
        ]);
        setData(response);
        setActiveClassNames(classes.map((item) => item.name));
      } catch (error) {
        const message =
          error instanceof ApiRequestError
            ? error.message
            : "Failed to load analytics";
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, []);

  // Use default values while loading or on error
  const summary = data?.summary || {
    totalStudents: 0,
    totalTeachers: 0,
    totalCollected: 0,
    totalPending: 0,
    totalInvoiced: 0,
    collectionRate: 0,
    avgAttendance: 0,
  };

  const monthlyCollection = data?.monthlyCollection || [];
  const pendingDuesByClass = (data?.pendingDuesByClass || []).filter((row) =>
    activeClassNames.length > 0 ? activeClassNames.includes(row.className) : true,
  );
  const teacherWorkload = data?.teacherWorkload || [];
  const attendanceTrends = (data?.attendanceTrends || []).filter((row) =>
    activeClassNames.length > 0 ? activeClassNames.includes(row.className) : true,
  );
  const gradeDistribution = data?.gradeDistribution || [];

  // Custom tooltip for charts
  type TooltipEntry = {
    name: string;
    value: number;
  };

  type TooltipProps = {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  };

  const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium text-foreground">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-muted-foreground">
              {entry.name}: {entry.value.toLocaleString()}
              {entry.name === "Percentage" ? "%" : ""}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="section-header mb-0">
        <div>
        <h1 className="section-title tracking-tight">
          Analytics & Reports
        </h1>
        <p className="section-subtitle mt-1">
          Comprehensive insights into fees, attendance, and teacher workload.
        </p>
        </div>
      </div>

      {isLoading ? (
        <SectionLoader label="Loading analytics..." />
      ) : !data ? (
        <EmptyState
          title="Analytics unavailable"
          description="We could not load report data right now. Please refresh and try again."
        />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid-dashboard gap-5">
            <div className="stat-card card-hover hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {summary.totalStudents}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Users className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="stat-card card-hover hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Teachers</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {summary.totalTeachers}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <GraduationCap className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="stat-card card-hover hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Collection Rate</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {summary.collectionRate.toFixed(1)}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="h-6 w-6" />
                </div>
              </div>
            </div>

            <div className="stat-card card-hover hover:scale-[1.01]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Attendance</p>
                  <p className="text-2xl font-bold text-foreground mt-1">
                    {summary.avgAttendance.toFixed(1)}%
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <TrendingUp className="h-6 w-6" />
                </div>
              </div>
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Monthly Fee Collection */}
            <div className="card card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Monthly Fee Collection
                </h3>
              </div>
              {monthlyCollection.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No fee transactions recorded.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyCollection}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="amount"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Pending Dues by Class */}
            <div className="card card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Pending Dues by Class
                </h3>
              </div>
              {pendingDuesByClass.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending dues.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={pendingDuesByClass}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="className"
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pending" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Teacher Workload Distribution */}
            <div className="card card-elevated p-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">
                  Teacher Workload Distribution
                </h3>
              </div>
              {teacherWorkload.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No teacher data.
                </p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={teacherWorkload}
                        dataKey="loadUnits"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={(entry) => entry.name.split(" ")[0]}
                      >
                        {teacherWorkload.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORS[index % COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Teacher Workload Table */}
            <div className="card card-elevated overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Teacher Workload (Detailed)</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="data-table w-full">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Teacher
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Load Units
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherWorkload.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-sm text-muted-foreground text-center">
                          No teacher workload data.
                        </td>
                      </tr>
                    ) : (
                      teacherWorkload.map((row) => (
                        <tr key={row.id}>
                          <td>{row.name}</td>
                          <td className="font-medium">{row.loadUnits}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Monthly Fee Collection Table */}
            <div className="card card-elevated overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Monthly Fee Collection (Detailed)</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="data-table w-full">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Month
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Collected
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyCollection.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="px-6 py-4 text-sm text-muted-foreground text-center">
                          No data.
                        </td>
                      </tr>
                    ) : (
                      monthlyCollection.map((row) => (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td className="font-medium">
                            Rs. {row.amount.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pending Dues Table */}
            <div className="card card-elevated overflow-hidden p-0">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Pending Dues by Class (Detailed)</h3>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <table className="data-table w-full">
                  <thead className="sticky top-0">
                    <tr>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-6 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Pending
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingDuesByClass.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-4 text-sm text-muted-foreground text-center">
                          No pending dues data.
                        </td>
                      </tr>
                    ) : (
                      pendingDuesByClass.map((row) => (
                        <tr key={row.className}>
                          <td>{row.className}</td>
                          <td>{row.students}</td>
                          <td className="text-destructive font-medium">
                            Rs. {row.pending.toLocaleString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminReports;
