import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  ArrowRight,
  Search,
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  CalendarOff,
  type LucideIcon,
} from "lucide-react";
import { type Teacher, type Course, type Student } from "@/types/domain";
import { toast } from "sonner";
import { cambridgeGradeColor, percentageToCambridgeGrade } from "@/lib/grades";
import { useTeacherQuizzes } from "@/hooks/use-teacher-quizzes";
import { apiAuthRequest } from "@/lib/api";

interface Props {
  teacher: Teacher;
  students: Student[];
  allClasses?: Array<{ id: string; name: string }>;
  onNavigate: (nav: string) => void;
  onSelectClass?: (course: Course) => void;
}

type BackendAssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  status?: string;
  marks?: number | null;
  feedback?: string;
};

type BackendLeaveRequest = {
  status: "Pending" | "Approved" | "Rejected";
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
  teacherId: string;
  teacherName: string;
};

type BackendAttendanceItem = {
  sessionId: string;
  className: string;
  date: string;
  time: string;
  status?: "Present" | "Absent" | "Late" | "Leave";
  teacherName: string;
};

type BackendTimetableSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
};

type StudentTestRow = {
  subject: string;
  test: string;
  marks: number;
  total: number;
  term: string;
  grade: string;
};

type StudentAssignmentRow = {
  title: string;
  subject: string;
  due: string;
  status: string;
  score: string;
};

type StudentDetailData = {
  attendance: { present: number; absent: number; late: number; total: number };
  tests: StudentTestRow[];
  assignments: StudentAssignmentRow[];
  monthly: { label: string; percentage: number }[];
  timetable: BackendTimetableSlot[];
};

const emptyStudentDetail: StudentDetailData = {
  attendance: { present: 0, absent: 0, late: 0, total: 0 },
  tests: [],
  assignments: [],
  monthly: [],
  timetable: [],
};

const toPercentage = (marks: number, total: number) =>
  total > 0 ? (marks / total) * 100 : 0;

const formatDate = (value: string) => {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
};

const average = (values: number[]) => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const TeacherDashboard = ({ teacher, students, allClasses = [], onNavigate }: Props) => {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "tests" | "assignments" | "monthly" | "timetable">("overview");

  const classNameMap = Object.fromEntries((allClasses ?? []).map(c => [c.id, c.name]));
  const displayClassNames = (teacher.classes ?? []).map(id => classNameMap[id] || id);

  const { data: statsData } = useQuery({
    queryKey: ["teacher-dashboard-stats"],
    queryFn: async () => {
      const [submissionsResult, leavesResult] = await Promise.allSettled([
        apiAuthRequest<BackendAssignmentSubmission[]>(
          "/assignments/submissions/list",
        ),
        apiAuthRequest<BackendLeaveRequest[]>("/leaves/requests"),
      ]);

      const pendingGrading =
        submissionsResult.status === "fulfilled"
          ? submissionsResult.value.filter(
              (item) =>
                item.status === "Submitted" &&
                (item.marks === undefined || item.marks === null),
            ).length
          : 0;

      const pendingLeaves =
        leavesResult.status === "fulfilled"
          ? leavesResult.value.filter((item) => item.status === "Pending").length
          : 0;

      return { pendingGrading, pendingLeaves };
    },
  });

  const pendingGrading = statsData?.pendingGrading ?? 0;
  const pendingLeaves = statsData?.pendingLeaves ?? 0;

  const { data: detailData, isLoading: studentDetailLoading } = useQuery({
    queryKey: ["teacher-student-detail", selectedStudent?.backendId],
    queryFn: async () => {
      if (!selectedStudent?.backendId) return emptyStudentDetail;

      const [
        attendanceResult,
        gradebookResult,
        assignmentsResult,
        submissionsResult,
        timetableResult,
      ] = await Promise.allSettled([
        apiAuthRequest<BackendAttendanceItem[]>(
          `/attendance/students/${selectedStudent.backendId}`,
        ),
        apiAuthRequest<BackendGradebookEntry[]>(
          `/gradebook/students/${selectedStudent.backendId}`,
        ),
        apiAuthRequest<BackendAssignment[]>(
          `/assignments?studentId=${encodeURIComponent(selectedStudent.backendId)}`,
        ),
        apiAuthRequest<BackendAssignmentSubmission[]>(
          `/assignments/submissions/list?studentId=${encodeURIComponent(selectedStudent.backendId)}`,
        ),
        apiAuthRequest<BackendTimetableSlot[]>("/timetable/slots"),
      ]);

      const attendanceItems =
        attendanceResult.status === "fulfilled" ? attendanceResult.value : [];
      const gradebookItems =
        gradebookResult.status === "fulfilled" ? gradebookResult.value : [];
      const assignments =
        assignmentsResult.status === "fulfilled" ? assignmentsResult.value : [];
      const submissions =
        submissionsResult.status === "fulfilled" ? submissionsResult.value : [];
      const timetableItems =
        timetableResult.status === "fulfilled"
          ? timetableResult.value.filter(
              (slot) =>
                slot.className === selectedStudent.grade &&
                (!teacher.backendId || slot.teacherId === teacher.backendId),
            )
          : [];

      const attendanceSummary = attendanceItems.reduce(
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

      const tests = gradebookItems.map((entry) => {
        const marks = entry.marks ?? 0;
        const percentage = toPercentage(marks, entry.totalMarks);
        return {
          subject: entry.subject,
          test: entry.assessment,
          marks,
          total: entry.totalMarks,
          term: entry.term,
          grade: percentageToCambridgeGrade(percentage),
        };
      });

      const monthly = Object.entries(
        gradebookItems.reduce<Record<string, number[]>>((grouped, entry) => {
          const percentage = toPercentage(entry.marks ?? 0, entry.totalMarks);
          grouped[entry.term] = grouped[entry.term] || [];
          grouped[entry.term].push(percentage);
          return grouped;
        }, {}),
      )
        .map(([label, percentages]) => ({
          label,
          percentage: average(percentages),
        }))
        .sort((left, right) => left.label.localeCompare(right.label));

      const submissionByAssignmentId = new Map(
        submissions.map((submission) => [submission.assignmentId, submission]),
      );

      const mappedAssignments = assignments.map((assignment) => {
        const submission = submissionByAssignmentId.get(assignment.id);
        const status =
          submission?.status ?? (submission ? "Submitted" : "Pending");
        return {
          title: assignment.title,
          subject: assignment.subject,
          due: assignment.dueDate,
          status,
          score:
            submission?.marks === undefined || submission?.marks === null
              ? "—"
              : `${submission.marks}/${assignment.totalMarks}`,
        };
      });

      return {
        attendance: attendanceSummary,
        tests,
        assignments: mappedAssignments,
        monthly,
        timetable: timetableItems,
      };
    },
    enabled: !!selectedStudent?.backendId,
  });

  const studentDetail = detailData ?? emptyStudentDetail;

  const { pendingCount: pendingQuizChecks } = useTeacherQuizzes({
    teacherId: teacher.id,
    teacherBackendId: teacher.backendId,
    teacherSubject: teacher.subject,
  });

  const filteredStudents = students.filter((s) => {
    const query = search.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      String(s.id).includes(query) ||
      `STU-${String(s.id).padStart(4, "0")}`.toLowerCase().includes(query)
    );
  });

  const handleAvatarClick = () => {
    toast.info("Profile picture preview – this would open the full image.");
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-6">
      {/* Welcome Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          Welcome, {teacher.name.split(" ").slice(1).join(" ")}!
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Subject: {teacher.subject} · Classes: {displayClassNames.join(", ")}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="My Classes"
          value={(teacher.classes ?? []).length}
          icon={BookOpen}
          color="text-success bg-success/10"
          onClick={() => onNavigate("classes")}
        />
        <StatCard
          label="Pending Quizzes"
          value={pendingQuizChecks}
          icon={ClipboardList}
          color="text-info bg-info/10"
          onClick={() => onNavigate("checkQuizzes")}
        />
        <StatCard
          label="Pending Grading"
          value={pendingGrading}
          icon={ClipboardList}
          color="text-warning bg-warning/10"
          onClick={() => onNavigate("assignments")}
        />
        <StatCard
          label="Pending Leaves"
          value={pendingLeaves}
          icon={CalendarOff}
          color="text-info bg-info/10"
          onClick={() => onNavigate("leave")}
        />
      </div>

      {/* Student Search & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Search Card */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" /> Search Student
            </h3>
          </div>
          <div className="p-5">
            <input
              type="text"
              placeholder="Search by name or student ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
              aria-label="Search students"
            />
            <div className="mt-4 max-h-60 overflow-y-auto space-y-2 scrollbar-thin">
              {filteredStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No student found.</p>
              ) : (
                filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => {
                      setSelectedStudent(s);
                      setActiveTab("overview");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-muted/10 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {s.avatar}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-medium text-foreground">
                          {s.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ID: STU-{String(s.id).padStart(4, "0")} · {s.grade}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Student Detail Panel */}
        {selectedStudent ? (
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            {/* Header with avatar and close */}
            <div className="px-5 py-4 border-b border-border/60 bg-muted/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  onClick={handleAvatarClick}
                  className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg cursor-pointer hover:opacity-80 transition-opacity"
                >
                  {selectedStudent.avatar}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{selectedStudent.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    ID: STU-{String(selectedStudent.id).padStart(4, "0")} · {selectedStudent.grade}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStudent(null)}
                className="p-1.5 rounded-full hover:bg-muted/30 transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Tab Buttons */}
            <div className="flex flex-wrap gap-1 px-5 pt-4 border-b border-border/50">
              {(["overview", "tests", "assignments", "monthly", "timetable"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    activeTab === tab
                      ? "bg-primary/10 text-primary shadow-sm"
                      : "text-muted-foreground hover:bg-muted/30"
                  }`}
                >
                  {tab === "overview" && "Overview"}
                  {tab === "tests" && "Test Scores"}
                  {tab === "assignments" && "Assignments"}
                  {tab === "monthly" && "Term Grades"}
                  {tab === "timetable" && "Timetable"}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-5 max-h-[500px] overflow-y-auto scrollbar-thin">
              {studentDetailLoading && (
                <div className="mb-4 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                  <span className="spinner h-4 w-4" />
                  Loading live student data...
                </div>
              )}

              {activeTab === "overview" && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl bg-muted/20 p-3 border border-border/40">
                      <p className="text-xs text-muted-foreground">Attendance</p>
                      <p className="text-xl font-bold text-foreground mt-1">
                        {studentDetail.attendance.present}/{studentDetail.attendance.total}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {studentDetail.attendance.total > 0
                          ? ((studentDetail.attendance.present / studentDetail.attendance.total) * 100).toFixed(1)
                          : "0.0"}%
                      </p>
                    </div>
                    <div className="rounded-xl bg-muted/20 p-3 border border-border/40">
                      <p className="text-xs text-muted-foreground">Assessments</p>
                      <p className="text-xl font-bold text-foreground mt-1">{studentDetail.tests.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Gradebook entries</p>
                    </div>
                    <div className="rounded-xl bg-muted/20 p-3 border border-border/40">
                      <p className="text-xs text-muted-foreground">Assignments</p>
                      <p className="text-xl font-bold text-foreground mt-1">{studentDetail.assignments.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Assigned/submitted</p>
                    </div>
                    <div className="rounded-xl bg-muted/20 p-3 border border-border/40">
                      <p className="text-xs text-muted-foreground">Timetable Slots</p>
                      <p className="text-xl font-bold text-foreground mt-1">{studentDetail.timetable.length}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">For {selectedStudent.grade}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <InfoItem icon={Mail} label="Email" value={selectedStudent.email} />
                    <InfoItem icon={BookOpen} label="Class" value={selectedStudent.grade} />
                    <InfoItem icon={User} label="Status" value={selectedStudent.status} />
                    <InfoItem icon={User} label="Guardian" value={selectedStudent.guardian} />
                    <InfoItem icon={Phone} label="Guardian Phone" value={selectedStudent.guardianPhone} />
                    <InfoItem icon={MapPin} label="Student ID" value={`STU-${String(selectedStudent.id).padStart(4, "0")}`} />
                    <InfoItem icon={Calendar} label="Backend ID" value={selectedStudent.backendId || "Not synced"} />
                  </div>
                </div>
              )}

              {activeTab === "tests" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        {["Subject", "Assessment", "Term", "Marks", "Percentage", "Grade"].map((h) => (
                          <th key={h} className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {studentDetail.tests.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center text-muted-foreground py-8">
                            No gradebook records found for this student.
                          </td>
                        </tr>
                      ) : (
                        studentDetail.tests.map((test, idx) => {
                          const percentage = toPercentage(test.marks, test.total);
                          return (
                            <tr key={`${test.subject}-${test.test}-${idx}`} className="hover:bg-muted/20 transition-colors">
                              <td className="p-2">{test.subject}</td>
                              <td className="p-2">{test.test}</td>
                              <td className="p-2">{test.term}</td>
                              <td className="p-2 font-mono">{test.marks}/{test.total}</td>
                              <td className="p-2">{percentage.toFixed(1)}%</td>
                              <td className={`p-2 font-semibold ${cambridgeGradeColor(test.grade)}`}>
                                {test.grade}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "assignments" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        {["Title", "Subject", "Due", "Status", "Score"].map((h) => (
                          <th key={h} className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {studentDetail.assignments.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">
                            No assignment records found for this student.
                          </td>
                        </tr>
                      ) : (
                        studentDetail.assignments.map((ass, idx) => (
                          <tr key={`${ass.title}-${idx}`} className="hover:bg-muted/20 transition-colors">
                            <td className="p-2 font-medium">{ass.title}</td>
                            <td className="p-2">{ass.subject}</td>
                            <td className="p-2">{formatDate(ass.due)}</td>
                            <td className="p-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                ass.status === "Submitted"
                                  ? "bg-success/15 text-success"
                                  : ass.status === "Late"
                                  ? "bg-destructive/15 text-destructive"
                                  : ass.status === "Missing"
                                  ? "bg-destructive/15 text-destructive"
                                  : "bg-warning/15 text-warning"
                              }`}>
                                {ass.status}
                              </span>
                            </td>
                            <td className="p-2 font-mono">{ass.score}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {activeTab === "monthly" && (
                <div>
                  <h4 className="font-medium text-foreground mb-4">Term Performance</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {studentDetail.monthly.length === 0 ? (
                      <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground text-center">
                        No term-level gradebook data available yet.
                      </div>
                    ) : (
                      studentDetail.monthly.map((p, idx) => {
                        const letter = percentageToCambridgeGrade(p.percentage);
                        return (
                          <div key={`${p.label}-${idx}`} className="rounded-xl bg-muted/20 p-3 text-center border border-border/40">
                            <div className="text-sm font-semibold text-foreground">{p.label}</div>
                            <div className={`text-xl font-bold mt-1 ${cambridgeGradeColor(letter)}`}>
                              {letter}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              ({p.percentage.toFixed(1)}%)
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "timetable" && (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/20 border-b border-border">
                      <tr>
                        {["Date", "Time", "Subject", "Teacher", "Class"].map((h) => (
                          <th key={h} className="text-left p-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {studentDetail.timetable.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="text-center text-muted-foreground py-8">
                            No timetable slots found for {selectedStudent.grade}.
                          </td>
                        </tr>
                      ) : (
                        studentDetail.timetable.map((slot) => (
                          <tr key={slot.id} className="hover:bg-muted/20 transition-colors">
                            <td className="p-2">{formatDate(slot.date)}</td>
                            <td className="p-2">{slot.startTime} – {slot.endTime}</td>
                            <td className="p-2 font-medium">{slot.subject}</td>
                            <td className="p-2">{slot.teacherName}</td>
                            <td className="p-2">{slot.className}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm p-8 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Search className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
              <p>Select a student to view details</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper components with refined styling
const StatCard = ({
  label,
  value,
  icon: Icon,
  color,
  onClick,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  color: string;
  onClick?: () => void;
}) => (
  <div
    onClick={onClick}
    className={`group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 ${
      onClick ? "cursor-pointer hover:border-primary/50" : ""
    }`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <div className="relative flex items-center justify-between mb-3">
      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
    <p className="text-3xl font-bold text-foreground">{value}</p>
  </div>
);

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-2 p-2 rounded-lg hover:bg-muted/20 transition-colors">
    <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-foreground truncate">{value || "—"}</p>
    </div>
  </div>
);

export default TeacherDashboard;