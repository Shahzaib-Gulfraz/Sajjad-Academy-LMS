import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import type { Student, Teacher } from "@/types/domain";
import { cambridgeGradeColor, percentageToCambridgeGrade } from "@/lib/grades";
import { useAdminData } from "@/hooks/use-admin-data";

const studentCode = (id: number) => `STU-${String(id).padStart(4, "0")}`;

const badge = (status: string) =>
  ({
    Paid: "badge-success",
    Submitted: "badge-success",
    Partial: "badge-warning",
    Pending: "badge-warning",
    Late: "badge-warning",
    Missing: "badge-destructive",
  }[status] || "badge");

const AdminUsers = () => {
  const [tab, setTab] = useState<"students" | "teachers">("students");
  const [studentSearch, setStudentSearch] = useState("");
  const [teacherSearch, setTeacherSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  
  const { students, teachers } = useAdminData();

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        studentCode(s.id).toLowerCase().includes(q) ||
        String(s.id).includes(q)
    );
  }, [studentSearch]);

  const filteredTeachers = useMemo(() => {
    const q = teacherSearch.trim().toLowerCase();
    if (!q) return teachers;
    return teachers.filter(
      (t) => t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    );
  }, [teacherSearch]);

  if (selectedStudent) {
    return (
      <div className="space-y-5 animate-fade-in">
        <button
          onClick={() => setSelectedStudent(null)}
          className="btn-ghost btn-sm inline-flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="card card-elevated p-5">
          <h2 className="text-xl font-bold text-foreground">{selectedStudent.name}</h2>
          <p className="text-sm text-muted-foreground">
            {studentCode(selectedStudent.id)} | {selectedStudent.grade} |{" "}
            {selectedStudent.email}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="stat-card p-4 block">
            <p className="text-xs text-muted-foreground">Latest Result</p>
            {(() => {
              const latest = selectedStudent.progress.at(-1);
              if (!latest) {
                return <p className="text-sm text-muted-foreground">No data</p>;
              }
              const grade = percentageToCambridgeGrade(latest.percentage);
              return (
                <div className="flex items-end gap-2">
                  <p className="text-2xl font-bold text-primary">
                    {latest.percentage.toFixed(1)}%
                  </p>
                  <p className={`text-sm font-semibold ${cambridgeGradeColor(grade)}`}>
                    {grade}
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="stat-card p-4 block">
            <p className="text-xs text-muted-foreground">Attendance</p>
            <p className="text-2xl font-bold text-info">
              {(
                (selectedStudent.attendance.present / selectedStudent.attendance.total) *
                100
              ).toFixed(0)}
              %
            </p>
          </div>
          <div className="stat-card p-4 block">
            <p className="text-xs text-muted-foreground">Pending Fee</p>
            <p className="text-2xl font-bold text-destructive">
              Rs. {selectedStudent.fees.pending.toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (selectedTeacher) {
    const subjectStudents = students.filter((s) =>
      s.tests.some((x) => x.subject === selectedTeacher.subject)
    );
    const assignments: any[] = []; // Admin doesn't need to see teacher assignments in this view, or we could fetch them

    return (
      <div className="space-y-5 animate-fade-in">
        <button
          onClick={() => setSelectedTeacher(null)}
          className="btn-ghost btn-sm inline-flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back
        </button>
        <div className="card card-elevated p-5">
          <h2 className="text-xl font-bold text-foreground">{selectedTeacher.name}</h2>
          <p className="text-sm text-muted-foreground">
            {selectedTeacher.subject} | {selectedTeacher.email}
          </p>
        </div>
        <div className="card p-4 mb-4">
          <p className="text-sm text-muted-foreground">
            Students in subject: {subjectStudents.length}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignments.map((a) => (
            <div key={a.id} className="card p-4">
              <p className="font-semibold text-foreground">{a.title}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Class {a.classGrade} | Due {a.dueDate}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="tabs flex-wrap border-0 gap-2">
        <button
          onClick={() => setTab("students")}
          className={`tab rounded-lg text-sm border ${
            tab === "students" ? "tab-active bg-primary text-primary-foreground border-primary" : "bg-card border-border"
          }`}
        >
          Students
        </button>
        <button
          onClick={() => setTab("teachers")}
          className={`tab rounded-lg text-sm border ${
            tab === "teachers" ? "tab-active bg-primary text-primary-foreground border-primary" : "bg-card border-border"
          }`}
        >
          Teachers
        </button>
      </div>

      {tab === "students" ? (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-foreground">Student Management</h1>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search by name or ID"
                className="input-modern border-0 bg-transparent p-0 text-sm"
              />
            </div>
          </div>
          <div className="card card-elevated overflow-hidden p-0">
            <table className="data-table w-full">
              <thead>
                <tr>
                  {["Student", "ID", "Class", "Latest %", "Fees"].map((h) => (
                    <th key={h}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  (() => {
                    const latest = s.progress.at(-1);
                    const percentage = latest?.percentage ?? 0;
                    const grade = percentageToCambridgeGrade(percentage);
                    return (
                  <tr
                    key={s.id}
                    onClick={() => setSelectedStudent(s)}
                    className="cursor-pointer"
                  >
                    <td>{s.name}</td>
                    <td className="text-muted-foreground">
                      {studentCode(s.id)}
                    </td>
                    <td>{s.grade}</td>
                    <td className="font-semibold">
                      <div className="flex items-center gap-2">
                        <span>{percentage.toFixed(1)}%</span>
                        <span className={`text-xs font-semibold ${cambridgeGradeColor(grade)}`}>
                          {grade}
                        </span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${badge(s.fees.status)}`}>
                        {s.fees.status}
                      </span>
                    </td>
                  </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-5">
            <h1 className="text-2xl font-bold text-foreground">Teacher Management</h1>
            <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-card">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                value={teacherSearch}
                onChange={(e) => setTeacherSearch(e.target.value)}
                placeholder="Search teacher or subject"
                className="input-modern border-0 bg-transparent p-0 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedTeacher(t)}
                className="card card-hover p-4 text-left hover:border-primary/40 hover:scale-[1.01]"
              >
                <p className="font-semibold text-foreground">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.subject}</p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
