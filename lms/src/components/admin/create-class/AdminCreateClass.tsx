import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Student } from "@/types/domain";
import type { AdminTeacherRecord } from "@/components/admin/teacher/types";

interface Props {
  classes: string[];
  classSubjects: Record<string, { id: string; name: string }[]>;
  teachers: AdminTeacherRecord[];
  students: Student[];
  onAddClass: (className: string, academicYear: string) => Promise<void>;
  onDeleteClass: (className: string) => Promise<void>;
  onAddSubject: (className: string, subject: string) => Promise<void>;
  onDeleteSubject: (className: string, subjectId: string) => Promise<void>;
  onUpdateSubject: (
    className: string,
    subjectId: string,
    newSubjectName: string
  ) => Promise<void>;
}

const AdminCreateClass = ({
  classes,
  classSubjects,
  teachers,
  students,
  onAddClass,
  onDeleteClass,
  onAddSubject,
  onDeleteSubject,
  onUpdateSubject,
}: Props) => {
  const [newClassName, setNewClassName] = useState("");
  const [academicYear, setAcademicYear] = useState("");
  const [selectedClass, setSelectedClass] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [editingSubject, setEditingSubject] = useState<{
    id: string;
    newName: string;
  } | null>(null);

  const normalizedClasses = useMemo(
    () => classes.map((item) => item.trim()).filter(Boolean),
    [classes]
  );

  const normalizedSubjects = useMemo(() => {
    if (!selectedClass) return [];
    const subjects = classSubjects[selectedClass] ?? [];
    return subjects.filter((item) => item.name.trim() !== "");
  }, [classSubjects, selectedClass]);

  const classDetails = useMemo(() => {
    if (!selectedClass) return null;
    const studentsInClass = students.filter((s) => s.grade === selectedClass);
    const teachersForClass = teachers.filter((t) =>
      t.classes.includes(selectedClass)
    );

    return {
      studentsInClass,
      teachersForClass,
    };
  }, [selectedClass, students, teachers]);

  const handleAddClass = async () => {
    const value = newClassName.trim();
    const yearValue = academicYear.trim();
    if (!value) {
      toast.error("Enter a class name.");
      return;
    }
    if (normalizedClasses.some((c) => c.toLowerCase() === value.toLowerCase())) {
      toast.error("Class already exists.");
      return;
    }
    try {
      await onAddClass(value, yearValue);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add class."
      );
      return;
    }
    setNewClassName("");
    setAcademicYear("");
    setSelectedClass(value);
    toast.success("New class added.");
  };

  const handleAddSubject = async () => {
    const value = newSubjectName.trim();
    if (!selectedClass) {
      toast.error("Select a class first.");
      return;
    }
    if (!value) {
      toast.error("Enter a subject name.");
      return;
    }
    if (
      normalizedSubjects.some(
        (s) => s.name.toLowerCase() === value.toLowerCase()
      )
    ) {
      toast.error("Subject already exists.");
      return;
    }
    try {
      await onAddSubject(selectedClass, value);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to add subject."
      );
      return;
    }
    setNewSubjectName("");
    toast.success("New subject added.");
  };

  const handleUpdateSubject = async () => {
    if (!editingSubject || !selectedClass) return;
    const subjectId = editingSubject.id;
    const newVal = editingSubject.newName.trim();

    if (!newVal) {
      toast.error("Subject name cannot be empty.");
      return;
    }

    const currentSubject = normalizedSubjects.find((s) => s.id === subjectId);
    if (currentSubject?.name === newVal) {
      setEditingSubject(null);
      return;
    }

    if (
      normalizedSubjects.some(
        (s) => s.id !== subjectId && s.name.toLowerCase() === newVal.toLowerCase()
      )
    ) {
      toast.error("A subject with this name already exists.");
      return;
    }

    try {
      await onUpdateSubject(selectedClass, subjectId, newVal);
      toast.success("Subject updated.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to update subject."
      );
      return;
    }
    setEditingSubject(null);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Create Classes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Add new classes to use in the timetable planner and for enrolling
          students.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <p className="font-semibold text-foreground">Add New Class</p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                placeholder="Class Name (e.g. 12-A)"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="Academic Year (e.g. 2026-2027)"
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => {
                void handleAddClass();
              }}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground sm:w-auto sm:self-end"
            >
              Add Class
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-foreground">Created Classes</p>
            <span className="text-xs text-muted-foreground">
              {normalizedClasses.length} total
            </span>
          </div>
          {normalizedClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No classes created yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {normalizedClasses.map((item) => (
                <div
                  key={`class-${item}`}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors ${
                    selectedClass === item
                      ? "border-primary bg-primary/10 ring-1 ring-primary/20"
                      : "border-border bg-background hover:border-primary/50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedClass(item)}
                    className={`text-left font-medium ${
                      selectedClass === item ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {item}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (selectedClass === item) {
                        setSelectedClass("");
                      }
                      try {
                        await onDeleteClass(item);
                        toast.success("Class deleted.");
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : "Unable to delete class."
                        );
                      }
                    }}
                    className="rounded-full border border-border px-2 py-0.5 text-[10px]"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {classDetails ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {selectedClass} Overview
                </h3>
                <p className="text-xs text-muted-foreground">
                  {classDetails.studentsInClass.length} students ·{" "}
                  {classDetails.teachersForClass.length} teachers
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <p className="font-semibold text-foreground">
                Add Subject to {selectedClass}
              </p>
              <div className="flex gap-2">
                <input
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  placeholder="e.g. Mathematics"
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <button
                  onClick={() => {
                    void handleAddSubject();
                  }}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-foreground">
                  Configured Subjects
                </p>
                <span className="text-xs text-muted-foreground">
                  {normalizedSubjects.length} total
                </span>
              </div>
              {normalizedSubjects.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No subjects configured.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {normalizedSubjects.map((item) => {
                    const isEditing = editingSubject?.id === item.id;
                    return (
                      <div
                        key={`subject-${item.id}`}
                        className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs"
                      >
                        {isEditing ? (
                          <input
                            autoFocus
                            value={editingSubject.newName}
                            onChange={(e) =>
                              setEditingSubject({
                                ...editingSubject,
                                newName: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void handleUpdateSubject();
                              } else if (e.key === "Escape") {
                                setEditingSubject(null);
                              }
                            }}
                            onBlur={() => {
                              void handleUpdateSubject();
                            }}
                            className="bg-transparent border-none outline-none w-24 text-foreground text-xs"
                          />
                        ) : (
                          <span
                            onDoubleClick={() =>
                              setEditingSubject({ id: item.id, newName: item.name })
                            }
                          >
                            {item.name}
                          </span>
                        )}

                        <div className="flex items-center border-l border-border pl-2 ml-1 gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingSubject({ id: item.id, newName: item.name })
                            }
                            className="text-[10px] hover:text-primary"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await onDeleteSubject(selectedClass, item.id);
                                toast.success("Subject deleted.");
                              } catch (error) {
                                toast.error(
                                  error instanceof Error
                                    ? error.message
                                    : "Unable to delete subject."
                                );
                              }
                            }}
                            className="text-[10px] text-destructive hover:underline"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-border bg-card/30 p-10 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              />
            </svg>
          </div>
          <p className="font-medium text-foreground">No Class Selected</p>
          <p className="text-sm text-muted-foreground mt-1 max-w-xs mx-auto">
            Select a class from the "Created Classes" list above to add subjects
            and view its overview.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdminCreateClass;
