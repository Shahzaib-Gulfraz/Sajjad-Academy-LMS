import { ArrowLeft, Plus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { type Student, type Teacher } from "@/types/domain";
import { toast } from "sonner";

export type NewAssignmentDraft = {
  title: string;
  classGrade: string;
  dueDate: string;
  totalMarks: number;
  description: string;
  question: string;
  chapterName: string;
  chapterNumber: number;
  submissionType: "Handwritten" | "Word" | "PDF";
  instructions: string;
  assignedStudentIds: number[];
};

interface Props {
  teacher: Teacher;
  students: Student[];
  newAssignment: NewAssignmentDraft;
  onChange: (next: NewAssignmentDraft) => void;
  onCreate: () => void;
  onBack: () => void;
  allTeacherClasses?: { id: string; name: string }[];
}

const CreateAssignmentView = ({
  teacher,
  students,
  newAssignment,
  onChange,
  onCreate,
  onBack,
  allTeacherClasses = [],
}: Props) => {
  const [studentSearch, setStudentSearch] = useState("");

  const classStudents = useMemo(
    () => students.filter((s) => s.grade === newAssignment.classGrade),
    [newAssignment.classGrade, students],
  );

  const selectedStudents = useMemo(
    () => classStudents.filter((s) => newAssignment.assignedStudentIds.includes(s.id)),
    [classStudents, newAssignment.assignedStudentIds],
  );
  const canCreate =
    Boolean(newAssignment.title.trim()) &&
    Boolean(newAssignment.classGrade.trim()) &&
    Boolean(newAssignment.dueDate) &&
    Boolean(newAssignment.question.trim()) &&
    Boolean(newAssignment.instructions.trim());

  useEffect(() => {
    const allowedIds = new Set(classStudents.map((s) => s.id));
    const filtered = newAssignment.assignedStudentIds.filter((id) => allowedIds.has(id));
    if (filtered.length !== newAssignment.assignedStudentIds.length) {
      onChange({ ...newAssignment, assignedStudentIds: filtered });
    }
  }, [classStudents, newAssignment, onChange]);

  const handleToggleStudent = (studentId: number) => {
    const isSelected = newAssignment.assignedStudentIds.includes(studentId);
    const nextIds = isSelected
      ? newAssignment.assignedStudentIds.filter((id) => id !== studentId)
      : [...newAssignment.assignedStudentIds, studentId];
    onChange({ ...newAssignment, assignedStudentIds: nextIds });
  };

  const handleAddBySearch = () => {
    const query = studentSearch.trim();
    if (!query) return;

    const byId = Number.isNaN(Number(query))
      ? null
      : classStudents.find((s) => s.id === Number(query));
    const byName = classStudents.find((s) =>
      s.name.toLowerCase().includes(query.toLowerCase()),
    );
    const match = byId || byName;

    if (!match) {
      toast.error("No matching student found in this class.");
      return;
    }

    if (!newAssignment.assignedStudentIds.includes(match.id)) {
      onChange({
        ...newAssignment,
        assignedStudentIds: [...newAssignment.assignedStudentIds, match.id],
      });
    }
    setStudentSearch("");
  };

  const renderStudentRow = (s: Student) => {
    const checked = newAssignment.assignedStudentIds.includes(s.id);
    return (
      <label
        key={s.id}
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={checked}
            onChange={() => handleToggleStudent(s.id)}
            className="h-4 w-4"
          />
          <div>
            <p className="font-medium">{s.name}</p>
          </div>
        </div>
        <span className="text-xs text-muted-foreground">{s.grade}</span>
      </label>
    );
  };

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 flex items-center gap-2 text-sm text-primary transition-colors hover:text-primary/80"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Assignments
      </button>

      <h1 className="text-2xl font-bold text-foreground mb-6">Create New Assignment</h1>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Title *</label>
            <input
              value={newAssignment.title}
              onChange={(e) => onChange({ ...newAssignment, title: e.target.value })}
              placeholder="Assignment title"
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Class *</label>
            <select
              value={newAssignment.classGrade}
              onChange={(e) => onChange({ ...newAssignment, classGrade: e.target.value })}
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
            >
              {teacher.classes.map((clsId) => {
                const classObj = allTeacherClasses.find((c) => c.id === clsId);
                return (
                  <option key={clsId} value={clsId}>
                    {classObj ? classObj.name : clsId}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Due Date *</label>
            <input
              type="date"
              value={newAssignment.dueDate}
              onChange={(e) => onChange({ ...newAssignment, dueDate: e.target.value })}
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Total Marks</label>
            <input
              type="number"
              value={newAssignment.totalMarks}
              onChange={(e) =>
                onChange({ ...newAssignment, totalMarks: Number(e.target.value) })
              }
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Chapter Name</label>
            <input
              value={newAssignment.chapterName}
              onChange={(e) => onChange({ ...newAssignment, chapterName: e.target.value })}
              placeholder="Chapter name"
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Chapter Number</label>
            <input
              type="number"
              value={newAssignment.chapterNumber}
              onChange={(e) =>
                onChange({ ...newAssignment, chapterNumber: Number(e.target.value) })
              }
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Submission Type</label>
            <select
              value={newAssignment.submissionType}
              onChange={(e) =>
                onChange({
                  ...newAssignment,
                  submissionType: e.target.value as "Handwritten" | "Word" | "PDF",
                })
              }
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
            >
              <option value="Handwritten">Handwritten</option>
              <option value="Word">Word</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Question *</label>
          <textarea
            value={newAssignment.question}
            onChange={(e) => onChange({ ...newAssignment, question: e.target.value })}
            rows={3}
            placeholder="Assignment question..."
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1 block">Instructions *</label>
          <textarea
            value={newAssignment.instructions}
            onChange={(e) => onChange({ ...newAssignment, instructions: e.target.value })}
            rows={3}
            placeholder="Instructions..."
            className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground resize-none"
          />
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-2 block">
            Assign To Students (optional)
          </label>
          <p className="text-xs text-muted-foreground mb-2">
            Leave empty to assign this to the whole class.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
            <input
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
              placeholder="Enter student ID or name"
              className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary placeholder:text-muted-foreground"
            />
            <button
              type="button"
              onClick={handleAddBySearch}
              className="px-4 py-2 rounded-lg border border-primary text-primary text-sm hover:bg-primary/10 transition-colors"
            >
              Add Student
            </button>
          </div>

          {selectedStudents.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {selectedStudents.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => handleToggleStudent(s.id)}
                  className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary"
                >
                  {s.name}
                </button>
              ))}
            </div>
          )}

          {classStudents.length > 0 ? (
            <div className="space-y-2 max-h-56 overflow-auto">
              {classStudents.map(renderStudentRow)}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">No students found for this class.</p>
          )}
        </div>

        <button
          onClick={onCreate}
          disabled={!canCreate}
          className="flex items-center gap-2 px-5 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:cursor-not-allowed disabled:opacity-70"
        >
          <Plus className="h-4 w-4" /> Create Assignment
        </button>
      </div>
    </div>
  );
};

export default CreateAssignmentView;
