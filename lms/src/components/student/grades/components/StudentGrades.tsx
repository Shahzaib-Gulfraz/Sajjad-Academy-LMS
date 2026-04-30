import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  BookOpen,
  TrendingUp,
} from "lucide-react";
import type { PortalStudent } from "../../types";
import { apiAuthRequest } from "@/lib/api";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { cambridgeGradeColor, percentageToCambridgeGrade } from "@/lib/grades";
import { useStudentQuizzes } from "@/hooks/use-student-quizzes";

interface Props {
  student: PortalStudent;
}

type BackendGradeEntry = {
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

const gradeColor = (g: string) => cambridgeGradeColor(g);

const gradeBg = (g: string) => {
  if (g.startsWith("A")) return "bg-success/15";
  if (g.startsWith("B")) return "bg-info/15";
  if (g.startsWith("C")) return "bg-warning/15";
  if (g.startsWith("D") || g.startsWith("E")) return "bg-warning/15";
  return "bg-destructive/15";
};

// Helper to assign a color based on performance (percentage)
const getBarColor = (percentage: number) => {
  if (percentage >= 90) return "#22c55e"; // green-500
  if (percentage >= 80) return "#3b82f6"; // blue-500
  if (percentage >= 70) return "#eab308"; // yellow-500
  if (percentage >= 60) return "#f97316"; // orange-500
  return "#ef4444"; // red-500
};

const StudentGrades = ({ student }: Props) => {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const { data: gradesData, isLoading } = useQuery({
    queryKey: ["student-grades-data", student.id, student.grade],
    queryFn: async () => {
      if (!student.id) return null;

      const [gradesRes, assignmentsRes, submissionsRes] =
        await Promise.allSettled([
          apiAuthRequest<BackendGradeEntry[]>(
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
        grades: gradesRes.status === "fulfilled" ? gradesRes.value : [],
        assignments:
          assignmentsRes.status === "fulfilled" ? assignmentsRes.value : [],
        submissions:
          submissionsRes.status === "fulfilled" ? submissionsRes.value : [],
      };
    },
    enabled: !!student.id,
  });

  const backendGrades = gradesData?.grades ?? [];
  const backendAssignments = gradesData?.assignments ?? [];
  const backendSubmissions = gradesData?.submissions ?? [];

  const { quizzes, submissions } = useStudentQuizzes({
    studentId: student.id,
    studentGrade: student.grade,
  });

  const subjectData = useMemo(() => {
    const allAssessments: Array<{ subject: string; test: string; marks: number; total: number; date: string; grade: string }> = [];

    // 1. Tests
    backendGrades.forEach(row => {
      if (row.totalMarks > 0) {
        const percent = row.marks !== null ? (row.marks / row.totalMarks) * 100 : 0;
        allAssessments.push({
          subject: row.subject,
          test: `Test: ${row.term} - ${row.assessment}`,
          marks: row.marks ?? 0,
          total: row.totalMarks,
          date: "", // Gradebook doesn't have a date by default in this type
          grade: percentageToCambridgeGrade(percent)
        });
      }
    });

    // 2. Assignments
    const assignmentMap = new Map(backendAssignments.map(a => [a.id, a]));
    backendSubmissions.forEach(sub => {
      if (sub.marks !== undefined && sub.marks !== null) {
        const assignment = assignmentMap.get(sub.assignmentId);
        if (assignment && assignment.totalMarks > 0) {
          const percent = (sub.marks / assignment.totalMarks) * 100;
          const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "";
          allAssessments.push({
            subject: assignment.subject,
            test: `Assignment: ${assignment.title}`,
            marks: sub.marks,
            total: assignment.totalMarks,
            date: dateStr,
            grade: percentageToCambridgeGrade(percent)
          });
        }
      }
    });

    // 3. Quizzes
    const quizMap = new Map(quizzes.map(q => [q.id, q]));
    submissions.forEach(sub => {
      if (sub.score !== undefined && sub.total > 0) {
        const quiz = quizMap.get(sub.quizId);
        if (quiz && quiz.subject) {
          const percent = (sub.score / sub.total) * 100;
          const dateStr = sub.submittedAt ? new Date(sub.submittedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : "";
          allAssessments.push({
            subject: quiz.subject,
            test: `Quiz: ${quiz.title}`,
            marks: sub.score,
            total: sub.total,
            date: dateStr,
            grade: percentageToCambridgeGrade(percent)
          });
        }
      }
    });

    // Group by subject
    const subjectsSet = Array.from(new Set(allAssessments.map(a => a.subject).filter(Boolean)));

    return subjectsSet.map(subject => {
      const tests = allAssessments.filter(a => a.subject === subject);
      const graded = tests.filter(test => test.total > 0);
      const avgPct = graded.length === 0 ? 0 : graded.reduce((sum, test) => sum + (test.marks / test.total) * 100, 0) / graded.length;
      
      return {
        subject,
        tests,
        avgPct,
        overallGrade: percentageToCambridgeGrade(avgPct),
      };
    });
  }, [backendGrades, backendAssignments, backendSubmissions, quizzes, submissions]);

  // Data for the chart
  const chartData = subjectData.map((sub) => ({
    subject: sub.subject,
    average: Number(sub.avgPct.toFixed(0)),
    grade: sub.overallGrade,
  }));

  if (subjectData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 animate-fade-in">
        <div className="rounded-full bg-primary/10 p-4 mb-4">
          <BookOpen className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">No Grades Yet</h3>
        <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
          Your teachers have not uploaded any grades for you yet. They will appear here once graded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto px-4 sm:px-6">

      {/* Grades Overview Chart - Enhanced card */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md p-5">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">
            Overall Subject Performance
          </h2>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                opacity={0.5}
              />
              <XAxis
                dataKey="subject"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                dy={5}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 100]}
                tickLine={false}
                axisLine={false}
                width={30}
                unit="%"
              />
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
                  fontWeight: "bold",
                  marginBottom: "4px",
                  color: "hsl(var(--foreground))",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                }}
                cursor={{ fill: "hsl(var(--muted)/0.3)" }}
                formatter={(value: number, name: string, props) => {
                  const grade = props.payload.grade;
                  return [`${value}% (Grade: ${grade})`, "Average"];
                }}
              />
              <Bar dataKey="average" radius={[6, 6, 0, 0]} maxBarSize={60}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getBarColor(entry.average)}
                    className="transition-opacity duration-200 hover:opacity-80"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-3">
          Average percentage per subject across all assessments
        </p>
      </div>

      {/* Subjects List */}
      <div className="space-y-4">
        {subjectData.map((sub) => {
          const isOpen = expandedSubject === sub.subject;
          return (
            <div
              key={sub.subject}
              className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md"
            >
              {/* Subject Header - Enhanced button */}
              <button
                onClick={() => setExpandedSubject(isOpen ? null : sub.subject)}
                className="w-full flex items-center justify-between p-5 hover:bg-muted/20 transition-colors text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:shadow-sm transition-all">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-base">
                      {sub.subject}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {sub.tests.length} assessment{sub.tests.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Average</p>
                    <p className="text-xl font-bold text-foreground">
                      {sub.avgPct.toFixed(0)}%
                    </p>
                  </div>
                  <span className={`badge text-sm font-bold px-2.5 py-1 rounded-full ${gradeColor(sub.overallGrade)} ${gradeBg(sub.overallGrade)}`}>
                    {sub.overallGrade}
                  </span>
                  {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground transition-transform group-hover:text-primary" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground transition-transform group-hover:text-primary" />
                  )}
                </div>
              </button>

              {/* Expanded Detail with smooth animation */}
              <div
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
              >
                <div className="overflow-hidden">
                  <div className="border-t border-border/80 bg-muted/10">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30 border-b border-border/50">
                          <tr>
                            {["Assessment", "Date", "Score", "Percentage", "Grade"].map(
                              (h) => (
                                <th
                                  key={h}
                                  className="px-5 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                                >
                                  {h}
                                </th>
                              ),
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/30">
                          {sub.tests.map((t, i) => {
                            const percent = t.total > 0 ? (t.marks / t.total) * 100 : 0;
                            const grade = percentageToCambridgeGrade(percent);
                            return (
                              <tr
                                key={i}
                                className="hover:bg-muted/20 transition-colors"
                              >
                                <td className="px-5 py-3 font-medium text-foreground">
                                  {t.test}
                                </td>
                                <td className="px-5 py-3 text-muted-foreground">
                                  {t.date || "—"}
                                </td>
                                <td className="px-5 py-3 font-medium tabular-nums">
                                  {t.marks}/{t.total}
                                </td>
                                <td className="px-5 py-3 text-muted-foreground tabular-nums">
                                  {percent.toFixed(0)}%
                                </td>
                                <td className="px-5 py-3">
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${gradeColor(grade)} ${gradeBg(grade)}`}>
                                    {grade}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentGrades;