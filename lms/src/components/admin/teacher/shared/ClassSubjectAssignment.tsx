import type { ClassSubjectForm } from "../types";

interface Props {
  form: ClassSubjectForm;
  classOptions: string[];
  subjectOptions: string[];
  classSubjectOptions: Record<string, string[]>;
  onToggleClass: (className: string) => void;
  onToggleSubject: (className: string, subject: string) => void;
}

const ClassSubjectAssignment = ({
  form,
  classOptions,
  subjectOptions,
  classSubjectOptions,
  onToggleClass,
  onToggleSubject,
}: Props) => {
  return (
    <>
      <div className="space-y-3">
        <p className="text-sm font-medium text-foreground">Assign Classes</p>
        <div className="flex flex-wrap gap-2">
          {classOptions.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No classes available. Create one in Class Administration first.</p>
          ) : (
            classOptions.map((className) => {
              const isSelected = form.classes.includes(className);
              return (
                <button
                  key={className}
                  type="button"
                  onClick={() => onToggleClass(className)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/20 font-medium"
                      : "border-border bg-background hover:border-primary/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {className}
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="space-y-4">
        {form.classes.map((className) => (
          <div key={className} className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 rounded-xl border border-border bg-muted/20 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">{className}: Select Courses</p>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                {(classSubjectOptions[className] ?? []).length} Available
              </span>
            </div>
            
            {(classSubjectOptions[className] ?? []).length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No courses are configured for {className}. Go to "Create Classes" to add them.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {(classSubjectOptions[className] ?? []).map((subject) => {
                  const isChecked = (form.classSubjects[className] || []).includes(subject);
                  return (
                    <button
                      key={`${className}-${subject}`}
                      type="button"
                      onClick={() => onToggleSubject(className, subject)}
                      className={`flex items-center gap-2.5 rounded-lg border p-2.5 text-xs transition-all text-left ${
                        isChecked
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border bg-background hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          isChecked
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-background"
                        }`}
                      >
                        {isChecked && (
                          <svg
                            className="h-2.5 w-2.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={4}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <span className="truncate font-medium">{subject}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
};

export default ClassSubjectAssignment;
