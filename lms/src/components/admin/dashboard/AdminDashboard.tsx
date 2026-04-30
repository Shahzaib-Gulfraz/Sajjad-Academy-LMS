import { useCallback, useMemo } from "react";
import {
  Users,
  GraduationCap,
  CalendarClock,
  Wallet,
  TrendingUp,
  Bell,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Announcement, Student } from "@/types/domain";
import { EmptyState } from "@/components/ui/states";

interface Props {
  students: Student[];
  teachersCount: number;
  announcements: Announcement[];
  pendingLeaves: number;
  onOpenStudent: (student: Student) => void;
  onOpenStudentSearch: () => void;
  onOpenTeacherSearch: () => void;
  onOpenAnnouncements: () => void;
  onOpenLeaveRequests: () => void;
  onOpenFeeWithDues: () => void;
}

// Helper to map grade to numeric value for bar length (optional)
const gradeToValue = (grade: string): number => {
  const map: Record<string, number> = {
    "A+": 12,
    A: 11,
    "A-": 10,
    "B+": 9,
    B: 8,
    "B-": 7,
    "C+": 6,
    C: 5,
    "C-": 4,
    D: 2,
    F: 0,
  };
  return map[grade] ?? 0;
};

type TopStudent = {
  name: string;
  fullName: string;
  className: string;
  letterGrade: string;
  percentage: number | null;
  value: number;
  id: number;
};

type TooltipPayload = {
  payload: TopStudent;
};

const AdminDashboard = ({
  students,
  teachersCount,
  announcements,
  pendingLeaves,
  onOpenStudent,
  onOpenStudentSearch,
  onOpenTeacherSearch,
  onOpenAnnouncements,
  onOpenLeaveRequests,
  onOpenFeeWithDues,
}: Props) => {
  const percentageToGrade = (percentage: number): string => {
    if (percentage >= 90) return "A+";
    if (percentage >= 85) return "A";
    if (percentage >= 80) return "A-";
    if (percentage >= 75) return "B+";
    if (percentage >= 70) return "B";
    if (percentage >= 65) return "B-";
    if (percentage >= 60) return "C+";
    if (percentage >= 55) return "C";
    if (percentage >= 50) return "C-";
    if (percentage >= 45) return "D";
    return "F";
  };

  const getStudentGradeInfo = useCallback((student: Student) => {
    const totals = student.tests.reduce(
      (acc, test) => {
        acc.marks += test.marks;
        acc.total += test.total;
        return acc;
      },
      { marks: 0, total: 0 }
    );

    if (totals.total === 0) {
      return { letterGrade: "N/A", percentage: null, value: 0 };
    }

    const percentage = (totals.marks / totals.total) * 100;
    const letterGrade = percentageToGrade(percentage);
    return { letterGrade, percentage, value: gradeToValue(letterGrade) };
  }, []);

  const buildTopStudents = useCallback((items: Student[]): TopStudent[] => {
    return items
      .map((s) => {
        const gradeInfo = getStudentGradeInfo(s);
        return {
          name: s.name.split(" ")[0],
          fullName: s.name,
          className: s.grade,
          letterGrade: gradeInfo.letterGrade,
          percentage: gradeInfo.percentage,
          value: gradeInfo.value,
          id: s.id,
        };
      })
      .sort((a, b) => {
        if (b.value !== a.value) return b.value - a.value;
        const aPct = a.percentage ?? -1;
        const bPct = b.percentage ?? -1;
        return bPct - aPct;
      });
  }, [getStudentGradeInfo]);

  // Overall top 5 students by grading system
  const topStudentsOverall = useMemo<TopStudent[]>(
    () => buildTopStudents(students).slice(0, 5),
    [students, buildTopStudents]
  );

  // Top performer per class
  const topStudentsByClass = useMemo<TopStudent[]>(() => {
    const byClass = new Map<string, TopStudent[]>();
    buildTopStudents(students).forEach((student) => {
      const list = byClass.get(student.className) ?? [];
      list.push(student);
      byClass.set(student.className, list);
    });

    return Array.from(byClass.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([className, list]) => {
        const top = list[0];
        return {
          ...top,
          name: className,
          className,
        };
      });
  }, [students, buildTopStudents]);

  const studentsWithDues = students.filter((s) => s.fees.pending > 0).length;

  // Custom tooltip for bar chart
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium text-foreground">{data.fullName}</p>
          <p className="text-muted-foreground">Class: {data.className}</p>
          <p className="text-muted-foreground">
            Grade: {data.letterGrade}
          </p>
          {data.percentage !== null && (
            <p className="text-muted-foreground">
              Score: {data.percentage.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="section-header">
        <div>
          <h1 className="section-title">Dashboard</h1>
          <p className="section-subtitle">Welcome back! Here's an overview of your academy</p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Students Card */}
        <button
          type="button"
          onClick={onOpenStudentSearch}
          className="group relative stat-card card-hover overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Students</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {students.length}
              </p>
              <p className="text-xs text-success mt-2">+2 new this month</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6" />
            </div>
          </div>
        </button>

        {/* Teachers Card */}
        <button
          type="button"
          onClick={onOpenTeacherSearch}
          className="group relative stat-card card-hover overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-accent/10 to-info/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Teachers</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {teachersCount}
              </p>
              <p className="text-xs text-info mt-2">All active</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-info/20 to-accent/10 text-info flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-6 w-6" />
            </div>
          </div>
        </button>

        {/* Pending Leaves Card */}
        <button
          type="button"
          onClick={onOpenLeaveRequests}
          className="group relative stat-card card-hover overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-warning/10 to-primary/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending Leaves</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {pendingLeaves}
              </p>
              <p className="text-xs text-warning mt-2">Awaiting approval</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-warning/20 to-primary/10 text-warning flex items-center justify-center flex-shrink-0">
              <CalendarClock className="h-6 w-6" />
            </div>
          </div>
        </button>

        {/* Fee Dues Card */}
        <button
          type="button"
          onClick={onOpenFeeWithDues}
          className="group relative stat-card card-hover overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-destructive/10 to-warning/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Fee Dues</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {studentsWithDues}
              </p>
              <p className="text-xs text-destructive mt-2">Students pending</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-destructive/20 to-warning/10 text-destructive flex items-center justify-center flex-shrink-0">
              <Wallet className="h-6 w-6" />
            </div>
          </div>
        </button>

        {/* Announcements Card */}
        <button
          type="button"
          onClick={onOpenAnnouncements}
          className="group relative stat-card card-hover overflow-hidden"
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br from-primary/10 to-accent/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative z-10 flex items-start justify-between">
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Announcements</p>
              <p className="text-3xl font-bold text-foreground mt-2">
                {announcements.length}
              </p>
              <p className="text-xs text-primary mt-2">Active notices</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 text-primary flex items-center justify-center flex-shrink-0">
              <Bell className="h-6 w-6" />
            </div>
          </div>
        </button>
      </div>

      {/* Charts and Lists Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers Chart */}
        <div className="card card-elevated">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border">
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Top Performers
              </h3>
              <p className="text-xs text-muted-foreground mt-1">Best performing students overall</p>
            </div>
          </div>
          {topStudentsOverall.length === 0 ? (
            <EmptyState
              title="No performance data yet"
              description="Top performers will appear here once students have recorded assessments."
              className="min-h-[220px]"
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topStudentsOverall}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 12]} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    onClick={(_, index) => {
                      if (index === undefined) return;
                      const student = topStudentsOverall[index];
                      const selected = students.find((s) => s.id === student.id);
                      if (selected) {
                        onOpenStudent(selected);
                      }
                    }}
                    // Show grade label on bars
                    label={{
                      position: "right",
                      content: ({ x, y, width, index }) => {
                        if (index === undefined) return null;
                        const student = topStudentsOverall[index];
                        const xPos =
                          typeof x === "number" ? x : Number(x ?? 0);
                        const widthValue =
                          typeof width === "number" ? width : Number(width ?? 0);
                        const yPos =
                          typeof y === "number" ? y : Number(y ?? 0);
                        return (
                          <text
                            x={xPos + widthValue + 5}
                            y={yPos + 12}
                            fill="hsl(var(--foreground))"
                            fontSize={12}
                            fontWeight={500}
                          >
                            {student.letterGrade}
                          </text>
                        );
                      },
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Click on a bar to view student details
          </div>
        </div>

        {/* Class-wise Top Performers */}
        <div className="card card-elevated p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Class-wise Top Performers
            </h3>
          </div>
          {topStudentsByClass.length === 0 ? (
            <EmptyState
              title="No class performance data"
              description="Add students and assessments to view the best performer in each class."
              className="min-h-[220px]"
            />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topStudentsByClass}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" domain={[0, 12]} hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                    width={60}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar
                    dataKey="value"
                    fill="hsl(var(--primary))"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                    onClick={(_, index) => {
                      if (index === undefined) return;
                      const student = topStudentsByClass[index];
                      const selected = students.find((s) => s.id === student.id);
                      if (selected) {
                        onOpenStudent(selected);
                      }
                    }}
                    label={{
                      position: "right",
                      content: ({ x, y, width, index }) => {
                        if (index === undefined) return null;
                        const student = topStudentsByClass[index];
                        const xPos =
                          typeof x === "number" ? x : Number(x ?? 0);
                        const widthValue =
                          typeof width === "number" ? width : Number(width ?? 0);
                        const yPos =
                          typeof y === "number" ? y : Number(y ?? 0);
                        return (
                          <text
                            x={xPos + widthValue + 5}
                            y={yPos + 12}
                            fill="hsl(var(--foreground))"
                            fontSize={12}
                            fontWeight={500}
                          >
                            {student.letterGrade}
                          </text>
                        );
                      },
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Best performer per class based on grading system
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
