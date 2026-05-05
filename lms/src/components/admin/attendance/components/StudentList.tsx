import type { Student } from "@/types/domain";

type TeacherClass = {
  id: string;
  name: string;
};

type Props = {
  students: Student[];
  onSelectStudent: (student: Student) => void;
  allTeacherClasses?: TeacherClass[];
};

const StudentList = ({ students, onSelectStudent, allTeacherClasses = [] }: Props) => {
  const getClassName = (clsId: string) => {
    const classObj = allTeacherClasses.find((c) => c.id === clsId);
    return classObj ? classObj.name : clsId;
  };

  if (students.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
        No students match your search.
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
      <div className="grid grid-cols-1 divide-y divide-border">
        {students.map((student) => (
          <button
            key={`student-row-${student.id}`}
            type="button"
            onClick={() => onSelectStudent(student)}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
          >
            <div>
              <p className="text-sm font-semibold text-foreground">{student.name}</p>
              <p className="text-xs text-muted-foreground">
                {getClassName(student.grade)}
              </p>
            </div>
            <span className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground transition hover:border-primary/60 hover:text-primary">
              Manage Records
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StudentList;
