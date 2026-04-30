import { FileText, Plus } from "lucide-react";
import type { Teacher, TeacherAssignment } from "@/types/domain";

interface Props {
  teacher: Teacher;
  assignments: TeacherAssignment[];
  filterClass: string;
  onFilterClass: (value: string) => void;
  onCreate: () => void;
  onSelectAssignment: (assignment: TeacherAssignment) => void;
  allTeacherClasses?: { id: string; name: string }[];
}

const AssignmentsListView = ({
  teacher,
  assignments,
  filterClass,
  onFilterClass,
  onCreate,
  onSelectAssignment,
  allTeacherClasses = [],
}: Props) => {
  const getClassName = (clsId: string) => {
    const classObj = allTeacherClasses.find((c) => c.id === clsId);
    return classObj ? classObj.name : clsId;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-foreground">Assignments</h1>
        <button
          onClick={onCreate}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-4 w-4" /> New Assignment
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => onFilterClass("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            filterClass === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-card border border-border text-muted-foreground"
          }`}
        >
          All Classes
        </button>

        {teacher.classes.map((c) => (
          <button
            key={c}
            onClick={() => onFilterClass(c)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterClass === c
                ? "bg-primary text-primary-foreground"
                : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {getClassName(c)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map((a) => {
          const submitted = a.submissions.filter(
            (s) => s.status === "Submitted" || s.status === "Late",
          ).length;
          const graded = a.submissions.filter((s) => s.marks !== undefined).length;
          const missing = a.submissions.filter((s) => s.status === "Missing").length;
          const isOverdue = new Date(a.dueDate) < new Date();

          return (
            <button
              key={a.id}
              onClick={() => onSelectAssignment(a)}
              className="text-left bg-card border border-border rounded-xl p-5 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold text-foreground">{a.title}</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-info/15 text-info">
                  {getClassName(a.classGrade)}
                </span>
              </div>

              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {a.description}
              </p>

              <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                <span>Due: {a.dueDate}</span>
                <span>Total: {a.totalMarks} marks</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/15 text-success">
                  {submitted} submitted
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-info/15 text-info">
                  {graded} graded
                </span>
                {missing > 0 && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/15 text-destructive">
                    {missing} missing
                  </span>
                )}
                {isOverdue && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-warning/15 text-warning">
                    Overdue
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {assignments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No assignments found for this class.</p>
        </div>
      )}
    </div>
  );
};

export default AssignmentsListView;
