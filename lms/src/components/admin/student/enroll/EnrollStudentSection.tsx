import { UserPlus } from "lucide-react";
import type { EnrollStudentForm } from "../types";
import { studentCode } from "../utils";

interface Props {
  enrollForm: EnrollStudentForm;
  onChange: (next: EnrollStudentForm) => void;
  onEnroll: () => void;
  classes: string[];
  activeSubjectOptions: string[];
  onToggleSubject: (subject: string) => void;
  lastEnrolledId: number | null;
}

const EnrollStudentSection = ({
  enrollForm,
  onChange,
  onEnroll,
  classes,
  activeSubjectOptions,
  onToggleSubject,
  lastEnrolledId,
}: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <UserPlus className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Enroll Student</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <input
          value={enrollForm.name}
          onChange={(e) => onChange({ ...enrollForm, name: e.target.value })}
          placeholder="Student Name"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />
        <div className="space-y-1">
          <input
            value={enrollForm.id}
            onChange={(e) => onChange({ ...enrollForm, id: e.target.value })}
            placeholder="Stu-0001"
            className="w-full rounded-lg border border-border bg-background px-3 py-2"
          />
          <p className="text-xs text-muted-foreground">
            {lastEnrolledId
              ? `Recently enrolled ID: ${studentCode(lastEnrolledId)}`
              : "Use a unique student ID like Stu-0001. The default password will be the same ID."}
          </p>
        </div>

        <select
          value={enrollForm.gender}
          onChange={(e) => onChange({ ...enrollForm, gender: e.target.value })}
          className="rounded-lg border border-border bg-background px-3 py-2"
        >
          <option value="">Select Gender</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
          <option value="Other">Other</option>
        </select>

        <input
          value={enrollForm.guardian}
          onChange={(e) => onChange({ ...enrollForm, guardian: e.target.value })}
          placeholder="Guardian Name"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />

        <input
          value={enrollForm.guardianPhone}
          onChange={(e) => onChange({ ...enrollForm, guardianPhone: e.target.value })}
          placeholder="Guardian Phone"
          className="rounded-lg border border-border bg-background px-3 py-2"
        />

      <div className="space-y-2 col-span-full">
        <p className="text-sm font-medium text-foreground">Select Class</p>
        <div className="flex flex-wrap gap-2">
          {classes.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">No classes available. Create one in Class Administration first.</p>
          ) : (
            classes.map((className) => (
              <button
                key={className}
                type="button"
                onClick={() =>
                  onChange({ ...enrollForm, className, subjects: [] })
                }
                className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                  enrollForm.className === className
                    ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20 font-medium"
                    : "border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                {className}
              </button>
            ))
          )}
        </div>
      </div>
    </div>

    {enrollForm.className && (
      <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">
            Select Subjects for {enrollForm.className}
          </p>
          <span className="text-xs text-muted-foreground">
            {activeSubjectOptions.length} available
          </span>
        </div>
        
        {activeSubjectOptions.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-4 text-center">
            <p className="text-xs text-muted-foreground italic">
              No subjects configured for this class yet. Go to "Create Classes" to add them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {activeSubjectOptions.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => onToggleSubject(subject)}
                className={`flex items-center gap-3 rounded-xl border p-3 text-sm transition-all text-left ${
                  enrollForm.subjects.includes(subject)
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <div
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                    enrollForm.subjects.includes(subject)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background"
                  }`}
                >
                  {enrollForm.subjects.includes(subject) && (
                    <svg
                      className="h-3 w-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <span className="truncate font-medium">{subject}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )}

      <button
        onClick={onEnroll}
        className="rounded-lg bg-primary px-4 py-2 text-primary-foreground"
      >
        Enroll Student
      </button>
    </div>
  );
};

export default EnrollStudentSection;
