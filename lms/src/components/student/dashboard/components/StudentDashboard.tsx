import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { FileText, UserCheck, ClipboardList, Award } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { PortalAnnouncement, PortalStudent } from "../../types";
import { cambridgeGradeColor, percentageToCambridgeGrade } from "@/lib/grades";
import { useStudentQuizzes } from "@/hooks/use-student-quizzes";
import { apiAuthRequest } from "@/lib/api";

interface Props {
  student: PortalStudent;
  announcements?: PortalAnnouncement[];
  onNavigate: (nav: string) => void;
}

type BackendAttendanceItem = {
  sessionId: string;
  className: string;
  date: string;
  time: string;
  status?: "Present" | "Absent" | "Late" | "Leave";
  teacherName: string;
};

type BackendGradebookEntry = {
  id: string;
  subject: string;
  classGrade: string;
  term: string;
  assessment: string;
  totalMarks: number;
  marks: number | null;
};

type BackendAssignment = {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  dueDate: string;
  totalMarks: number;
};

type BackendAssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  status: string;
  marks?: number;
};

const getBarColor = (percentage: number): string => {
  if (percentage >= 90) return "#10b981"; // emerald-500
  if (percentage >= 80) return "#22c55e"; // green-500
  if (percentage >= 70) return "#eab308"; // yellow-500
  if (percentage >= 60) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
};

const StudentDashboard = ({
  student,
  announcements = [],
  onNavigate,
}: Props) => {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["student-dashboard-data", student.id, student.grade],
    queryFn: async () => {
      if (!student.id) return null;

      const [
        attendanceResult,
        gradesResult,
        assignmentsResult,
        submissionsResult,
      ] = await Promise.allSettled([
        apiAuthRequest<BackendAttendanceItem[]>(
          `/attendance/students/${encodeURIComponent(student.id)}`,
        ),
        apiAuthRequest<BackendGradebookEntry[]>(
          `/gradebook/students/${encodeURIComponent(student.id)}`,
        ),
        apiAuthRequest<BackendAssignment[]>(
          `/assignments?classGrade=${encodeURIComponent(student.grade)}&studentId=${encodeURIComponent(student.id)}`,
        ),
        apiAuthRequest<BackendAssignmentSubmission[]>(
          `/assignments/submissions/list?studentId=${encodeURIComponent(student.id)}`,
        ),
      ]);

      return {
        attendance:
          attendanceResult.status === "fulfilled" ? attendanceResult.value : [],
        grades: gradesResult.status === "fulfilled" ? gradesResult.value : [],
        assignments:
          assignmentsResult.status === "fulfilled"
            ? assignmentsResult.value
            : [],
        submissions:
          submissionsResult.status === "fulfilled"
            ? submissionsResult.value
            : [],
      };
    },
    enabled: !!student.id,
  });

  const backendAttendance = dashboardData?.attendance ?? [];
  const backendGrades = dashboardData?.grades ?? [];
  const backendAssignments = dashboardData?.assignments ?? [];
  const backendSubmissions = dashboardData?.submissions ?? [];

  const { quizzes, submissions } = useStudentQuizzes({
    studentId: student.id,
    studentGrade: student.grade,
  });

  // Attendance percentage
  const attendanceSummary = useMemo(() => {
    return backendAttendance.reduce(
      (summary, session) => {
        const status = session.status ?? "Absent";
        if (status === "Present") summary.present += 1;
        if (status === "Absent") summary.absent += 1;
        if (status === "Late") summary.late += 1;
        summary.total += 1;
        return summary;
      },
      { present: 0, absent: 0, late: 0, total: 0 },
    );
  }, [backendAttendance]);

  const attPct =
    attendanceSummary.total > 0
      ? Math.round(
        (attendanceSummary.present / attendanceSummary.total) * 100,
      ).toString()
      : "0";

  const overallPercentage = useMemo(() => {
    let totalMarks = 0;
    let totalPossible = 0;

    // Grades (Tests)
    backendGrades.forEach(test => {
      if (test.marks !== null && test.marks !== undefined) {
        totalMarks += test.marks;
        totalPossible += test.totalMarks;
      }
    });

    // Assignments
    const assignmentMap = new Map(backendAssignments.map(a => [a.id, a]));
    backendSubmissions.forEach(sub => {
      if (sub.marks !== undefined && sub.marks !== null) {
        const assignment = assignmentMap.get(sub.assignmentId);
        if (assignment && assignment.totalMarks) {
          totalMarks += sub.marks;
          totalPossible += assignment.totalMarks;
        }
      }
    });

    // Quizzes
    submissions.forEach(sub => {
      if (sub.score !== undefined && sub.total !== undefined && sub.total > 0) {
        totalMarks += sub.score;
        totalPossible += sub.total;
      }
    });

    if (totalPossible === 0) return 0;
    return Math.round((totalMarks / totalPossible) * 100);
  }, [backendGrades, backendAssignments, backendSubmissions, submissions]);

  const overallGrade = percentageToCambridgeGrade(overallPercentage);

  const pendingQuizzes = useMemo(() => {
    const submitted = new Set(
      submissions.map((submission) => submission.quizId),
    );
    return quizzes.filter((quiz) => !submitted.has(quiz.id)).length;
  }, [quizzes, submissions]);

  const pendingAssignments = useMemo(() => {
    const submissionByAssignmentId = new Map(
      backendSubmissions.map((submission) => [
        submission.assignmentId,
        submission,
      ]),
    );

    return backendAssignments.filter((assignment) => {
      const submission = submissionByAssignmentId.get(assignment.id);
      return !submission || submission.status === "Pending";
    }).length;
  }, [backendAssignments, backendSubmissions]);

  const chartData = useMemo(() => {
    const combined: Array<{
      name: string;
      fullName: string;
      percentage: number;
      dateMs: number;
    }> = [];

    // Grades
    backendGrades.forEach((entry, idx) => {
      if (entry.marks !== null && entry.marks !== undefined && entry.totalMarks > 0) {
        const label = `${entry.subject} ${entry.term} ${entry.assessment}`;
        combined.push({
          name: label.length > 10 ? label.substring(0, 8) + "..." : label,
          fullName: label,
          percentage: (entry.marks / entry.totalMarks) * 100,
          dateMs: Date.now() - idx * 1000, // No date on gradebook, use index as fallback
        });
      }
    });

    // Assignments
    const assignmentMap = new Map(backendAssignments.map(a => [a.id, a]));
    backendSubmissions.forEach(sub => {
      if (sub.marks !== undefined && sub.marks !== null) {
        const assignment = assignmentMap.get(sub.assignmentId);
        if (assignment && assignment.totalMarks > 0) {
          const label = assignment.title;
          combined.push({
            name: label.length > 10 ? label.substring(0, 8) + "..." : label,
            fullName: label,
            percentage: (sub.marks / assignment.totalMarks) * 100,
            dateMs: sub.submittedAt ? new Date(sub.submittedAt).getTime() : Date.now(),
          });
        }
      }
    });

    // Quizzes
    const quizMap = new Map(quizzes.map(q => [q.id, q]));
    submissions.forEach(sub => {
      if (sub.score !== undefined && sub.total > 0) {
        const quiz = quizMap.get(sub.quizId);
        const label = quiz ? quiz.title : "Quiz";
        combined.push({
          name: label.length > 10 ? label.substring(0, 8) + "..." : label,
          fullName: label,
          percentage: (sub.score / sub.total) * 100,
          dateMs: sub.submittedAt ? new Date(sub.submittedAt).getTime() : Date.now(),
        });
      }
    });

    return combined
      .sort((a, b) => b.dateMs - a.dateMs)
      .slice(0, 5)
      .map(({ name, fullName, percentage }) => ({ name, fullName, percentage }));
  }, [backendGrades, backendAssignments, backendSubmissions, quizzes, submissions]);

  return (
    <div className="space-y-8 animate-fade-in px-4 sm:px-6 lg:px-8 py-6 max-w-7xl mx-auto">


      {/* Stats Cards - Improved grid and card styling */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Overall Grade Card */}
        <button
          onClick={() => onNavigate("grades")}
          className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 text-left focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Open grades"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              Overall Grade
            </p>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg text-white">
              <Award className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground tracking-tight">
              {overallGrade}
            </p>
          </div>
        </button>

        {/* Pending Quizzes */}
        <button
          onClick={() => onNavigate("quizzes")}
          className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 text-left focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Open quizzes"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              Pending Quizzes
            </p>
            <div className="w-10 h-10 rounded-xl bg-info/10 flex items-center justify-center text-info shadow-sm">
              <FileText className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">{pendingQuizzes}</p>
        </button>

        {/* Attendance */}
        <button
          onClick={() => onNavigate("attendance")}
          className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 text-left focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Open attendance"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              Attendance
            </p>
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent shadow-sm">
              <UserCheck className="h-5 w-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{attPct}%</p>
            <div className="w-full bg-muted/50 rounded-full h-1.5 mt-3">
              <div
                className="bg-accent h-1.5 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${Math.min(100, Number(attPct) || 0)}%` }}
              />
            </div>
          </div>
        </button>

        {/* Pending Work */}
        <button
          onClick={() => onNavigate("assignments")}
          className="group relative overflow-hidden rounded-2xl bg-card border border-border/50 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 text-left focus-visible:ring-2 focus-visible:ring-primary/30"
          aria-label="Open assignments"
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-medium text-muted-foreground tracking-wide uppercase">
              Pending Work
            </p>
            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning shadow-sm">
              <ClipboardList className="h-5 w-5" />
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground">
            {pendingAssignments}
          </p>
        </button>
      </div>

      {/* Charts & Announcements - Enhanced equal height layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grade Distribution Chart - Improved container and empty state */}
        <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
          <div className="p-5 pb-2">
            <h3 className="font-semibold text-foreground text-lg">
              Recent Test Performance
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Your latest assessment scores
            </p>
          </div>
          <div className="flex-1 p-4 pt-0 min-h-[220px]">
            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-sm text-muted-foreground bg-muted/20 rounded-lg">
                <p className="mb-1">No charts available</p>
                <p className="text-xs">Complete assessments to see your progress</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData} barCategoryGap={16} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: "hsl(215 20% 55%)" }}
                      axisLine={false}
                      tickLine={false}
                      dy={5}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: "hsl(215 20% 55%)" }}
                      axisLine={false}
                      tickLine={false}
                      width={30}
                      unit="%"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-popover border border-border rounded-lg p-3 text-sm shadow-xl backdrop-blur-sm">
                              <p className="font-semibold text-foreground mb-1">
                                {data.fullName}
                              </p>
                              <p className="text-muted-foreground">
                                Score:{" "}
                                <span className="text-foreground font-bold">
                                  {data.percentage.toFixed(1)}%
                                </span>
                              </p>
                              <p className="text-muted-foreground">
                                Grade:{" "}
                                <span
                                  className={`font-bold ${cambridgeGradeColor(percentageToCambridgeGrade(data.percentage))}`}
                                >
                                  {percentageToCambridgeGrade(data.percentage)}
                                </span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                      cursor={{ fill: "hsl(215 20% 95%)" }}
                    />
                    <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={50}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarColor(entry.percentage)}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Each bar shows your percentage score for the most recent tests
                </p>
              </>
            )}
          </div>
        </div>

        {/* Announcements - Improved list styling */}
        <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md flex flex-col h-full">
          <div className="p-5 pb-2">
            <h3 className="font-semibold text-foreground text-lg">
              Recent Announcements
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Stay updated with school news
            </p>
          </div>
          <div className="flex-1 p-2 pt-0">
            {announcements.slice(0, 3).length === 0 ? (
              <div className="flex items-center justify-center h-full text-sm text-muted-foreground bg-muted/20 rounded-lg p-6">
                <p>No recent announcements</p>
              </div>
            ) : (
              <div className="space-y-2">
                {announcements.slice(0, 3).map((a) => (
                  <div
                    key={a.id}
                    onClick={() => onNavigate("announcements")}
                    className="p-4 rounded-xl hover:bg-muted/40 transition-all duration-200 cursor-pointer group border border-transparent hover:border-border/50"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ${a.priority === "high"
                            ? "bg-destructive ring-1 ring-destructive/20"
                            : a.priority === "medium"
                              ? "bg-warning ring-1 ring-warning/20"
                              : "bg-muted-foreground ring-1 ring-muted-foreground/20"
                          }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {a.title}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          {a.date}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;