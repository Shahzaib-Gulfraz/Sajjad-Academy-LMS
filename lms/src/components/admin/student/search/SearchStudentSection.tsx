import { useEffect, useState } from "react";
import { Search, Trash2 } from "lucide-react";
import type { Student } from "@/types/domain";
import type { EditableStudent } from "../types";
import { studentCode } from "../utils";

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  filteredStudents: Student[];
  selectedStudentId: number | null;
  onSelectStudentId: (id: number) => void;
  editableStudent: EditableStudent;
  onEditableStudentChange: (next: Student) => void;
  onToggleSubject: (subject: string) => void;
  subjectOptions: string[];
  onSave: () => void;
  onDelete: (student: Student) => void;
  timetable: {
    time: string;
    mon?: string;
    tue?: string;
    wed?: string;
    thu?: string;
    fri?: string;
  }[];
  classes: string[];
}

const SearchStudentSection = ({
  query,
  onQueryChange,
  filteredStudents,
  selectedStudentId,
  onSelectStudentId,
  editableStudent,
  onEditableStudentChange,
  onToggleSubject,
  subjectOptions,
  onSave,
  onDelete,
  timetable,
  classes,
}: Props) => {
  const [viewMode, setViewMode] = useState<"preview" | "edit">("preview");

  useEffect(() => {
    setViewMode("preview");
  }, [selectedStudentId]);

  const gradeSystem =
    editableStudent && editableStudent.tests.length > 0
      ? "Letter (A+ to F)"
      : "N/A";

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-1 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by name or ID"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="max-h-[500px] overflow-auto space-y-2">
          {filteredStudents.map((student) => (
            <button
              key={student.id}
              onClick={() => onSelectStudentId(student.id)}
              className={`w-full rounded-lg border p-3 text-left ${
                selectedStudentId === student.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <p className="font-medium text-foreground">{student.name}</p>
              <p className="text-xs text-muted-foreground">
                {studentCode(student.id)} | {student.grade}
              </p>
            </button>
          ))}
        </div>
      </div>

      <div className="xl:col-span-2 rounded-xl border border-border bg-card p-4">
        {!editableStudent ? (
          <p className="text-sm text-muted-foreground">Select a student to view full details.</p>
        ) : (
          <div className="space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-foreground">{editableStudent.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {studentCode(editableStudent.id)} | {editableStudent.grade} | {editableStudent.email}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 rounded-lg border border-border p-1">
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      viewMode === "preview"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      viewMode === "edit"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Edit
                  </button>
                </div>
                <button
                  onClick={() => onDelete(editableStudent)}
                  className="p-2 rounded-lg border border-border hover:bg-destructive/10 text-destructive"
                  title="Delete Student"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              <input
                value={editableStudent.name}
                onChange={(e) => onEditableStudentChange({ ...editableStudent, name: e.target.value })}
                disabled={viewMode === "preview"}
                className="rounded-lg border border-border bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Name"
              />
              <input
                value={editableStudent.email}
                onChange={(e) => onEditableStudentChange({ ...editableStudent, email: e.target.value })}
                disabled={viewMode === "preview"}
                className="rounded-lg border border-border bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Email"
              />
              <div className="md:col-span-2 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Assignment</p>
                <div className="flex flex-wrap gap-2">
                  {classes.map((cn) => (
                    <button
                      key={cn}
                      type="button"
                      disabled={viewMode === "preview"}
                      onClick={() => onEditableStudentChange({ ...editableStudent, grade: cn })}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        editableStudent.grade === cn
                          ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20 font-medium"
                          : "border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:hover:border-border"
                      }`}
                    >
                      {cn}
                    </button>
                  ))}
                </div>
              </div>
              <input
                value={editableStudent.phone}
                onChange={(e) => onEditableStudentChange({ ...editableStudent, phone: e.target.value })}
                disabled={viewMode === "preview"}
                className="rounded-lg border border-border bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Phone"
              />
              <input
                value={editableStudent.guardian}
                onChange={(e) => onEditableStudentChange({ ...editableStudent, guardian: e.target.value })}
                disabled={viewMode === "preview"}
                className="rounded-lg border border-border bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Guardian"
              />
              <input
                value={editableStudent.guardianPhone}
                onChange={(e) =>
                  onEditableStudentChange({ ...editableStudent, guardianPhone: e.target.value })
                }
                disabled={viewMode === "preview"}
                className="rounded-lg border border-border bg-background px-3 py-2 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Guardian Phone"
              />
              <input
                value={editableStudent.address}
                onChange={(e) => onEditableStudentChange({ ...editableStudent, address: e.target.value })}
                disabled={viewMode === "preview"}
                className="rounded-lg border border-border bg-background px-3 py-2 md:col-span-2 disabled:cursor-not-allowed disabled:opacity-70"
                placeholder="Address"
              />
            </div>

            <div>
              <p className="text-sm font-medium text-foreground mb-2">Subjects</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {subjectOptions.map((subject) => (
                  <label
                    key={subject}
                    className="flex items-center gap-2 rounded-lg border border-border p-2 text-sm"
                  >
                    <input
                      type="checkbox"
                      disabled={viewMode === "preview"}
                      checked={editableStudent.tests.some((t) => t.subject === subject)}
                      onChange={() => onToggleSubject(subject)}
                    />
                    {subject}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Attendance</p>
                <p className="font-semibold">
                  {editableStudent.attendance.total > 0
                    ? `${Math.round(
                        (editableStudent.attendance.present / editableStudent.attendance.total) * 100,
                      )}%`
                    : "N/A"}
                </p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Grade System</p>
                <p className="font-semibold">{gradeSystem}</p>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground">Fee Status</p>
                <p className="font-semibold">{editableStudent.fees.status}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-3 border-b border-border text-sm font-medium">Grades</div>
              <div className="max-h-48 overflow-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-2 text-left">Subject</th>
                      <th className="px-3 py-2 text-left">Test</th>
                      <th className="px-3 py-2 text-left">Marks</th>
                      <th className="px-3 py-2 text-left">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableStudent.tests.map((test, idx) => (
                      <tr key={`${test.subject}-${idx}`} className="border-b border-border last:border-0">
                        <td className="px-3 py-2 text-sm">{test.subject}</td>
                        <td className="px-3 py-2 text-sm">{test.test}</td>
                        <td className="px-3 py-2 text-sm">
                          {test.marks}/{test.total}
                        </td>
                        <td className="px-3 py-2 text-sm">{test.grade}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-lg border border-border overflow-hidden">
              <div className="p-3 border-b border-border text-sm font-medium">Class Timetable</div>
              <div className="max-h-56 overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-2 py-2 text-left">Time</th>
                      <th className="px-2 py-2 text-left">Mon</th>
                      <th className="px-2 py-2 text-left">Tue</th>
                      <th className="px-2 py-2 text-left">Wed</th>
                      <th className="px-2 py-2 text-left">Thu</th>
                      <th className="px-2 py-2 text-left">Fri</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timetable.map((slot) => (
                      <tr key={slot.time} className="border-b border-border last:border-0">
                        <td className="px-2 py-2">{slot.time}</td>
                        <td className="px-2 py-2">{slot.mon || "-"}</td>
                        <td className="px-2 py-2">{slot.tue || "-"}</td>
                        <td className="px-2 py-2">{slot.wed || "-"}</td>
                        <td className="px-2 py-2">{slot.thu || "-"}</td>
                        <td className="px-2 py-2">{slot.fri || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {viewMode === "edit" && (
              <button onClick={onSave} className="rounded-lg bg-primary px-4 py-2 text-primary-foreground">
                Update Student Information
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchStudentSection;
