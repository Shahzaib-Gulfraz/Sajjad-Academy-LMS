import { useEffect, useMemo, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Pencil, Save, Trash2, User, TrendingUp, Award } from "lucide-react";
import { type Student, type Teacher } from "@/types/domain";
import { toast } from "sonner";
import { cambridgeGradeColor, percentageToCambridgeGrade } from "@/lib/grades";
import { apiAuthRequest } from "@/lib/api";
import { loadAuthSession } from "@/lib/auth";

type GradebookEntry = {
  id: string;
  teacherId: number;
  subject: string;
  classGrade: string;
  term: string;
  assessment: string;
  totalMarks: number;
  createdAt: string;
  marks: { studentId: number; marks: number }[];
};

type Props = {
  teacher: Teacher;
  students?: Student[];
  allTeacherClasses?: { id: string; name: string }[];
};

type BackendGradebookEntry = {
  id: string;
  teacherId: string;
  subject: string;
  classGrade: string;
  term: string;
  assessment: string;
  totalMarks: number;
  createdAt?: string;
  marks: { studentId: string; marks: number }[];
};

type GradebookSavePayload = {
  subject: string;
  classGrade: string;
  term: string;
  assessment: string;
  totalMarks: number;
  marks: { studentId: string; marks: number }[];
};

const TeacherGradebook = ({
  teacher,
  students = [],
  allTeacherClasses = [],
}: Props) => {
  const queryClient = useQueryClient();
  const [selectedClass, setSelectedClass] = useState(teacher.classes[0] || "");
  const [term, setTerm] = useState("Term 1");
  const [assessment, setAssessment] = useState("");
  const [totalMarks, setTotalMarks] = useState("100");
  const [marksMap, setMarksMap] = useState<Record<number, string>>({});
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [entriesPage, setEntriesPage] = useState(1);
  const [page, setPage] = useState(1);
  const [autoFillMissing, setAutoFillMissing] = useState(false);

  const pageSize = 20;
  const entriesPageSize = 10;

  const getClassName = (clsId: string) => {
    const classObj = allTeacherClasses.find((c) => c.id === clsId);
    return classObj ? classObj.name : clsId;
  };

  useEffect(() => {
    if (teacher.classes.length === 0) return;
    if (!selectedClass || !teacher.classes.includes(selectedClass)) {
      setSelectedClass(teacher.classes[0]);
    }
  }, [teacher.classes, selectedClass]);

  const {
    data: entriesData,
    isLoading: entriesLoading,
    fetchNextPage,
    hasNextPage,
  } = useInfiniteQuery({
    queryKey: [
      "teacher-gradebook-entries",
      teacher.id,
      teacher.backendId,
      teacher.subject,
    ],
    queryFn: async ({ pageParam = 1 }) => {
      const authTeacherId = loadAuthSession()?.user.id ?? "";
      if (!authTeacherId && !teacher.backendId && !teacher.subject.trim()) {
        return { items: [], nextCursor: null };
      }

      const query = authTeacherId
        ? `/gradebook/entries?teacherId=${encodeURIComponent(authTeacherId)}&page=${pageParam}&pageSize=${entriesPageSize}`
        : teacher.backendId
        ? `/gradebook/entries?teacherId=${encodeURIComponent(teacher.backendId)}&page=${pageParam}&pageSize=${entriesPageSize}`
        : `/gradebook/entries?subject=${encodeURIComponent(teacher.subject)}&page=${pageParam}&pageSize=${entriesPageSize}`;

      const response = await apiAuthRequest<BackendGradebookEntry[]>(query);

      const studentByBackendId = new Map(
        students
          .filter((student) => !!student.backendId)
          .map((student) => [student.backendId as string, student.id]),
      );

      const items: GradebookEntry[] = response.map((entry) => ({
        id: entry.id,
        teacherId: teacher.id,
        subject: entry.subject,
        classGrade: entry.classGrade,
        term: entry.term,
        assessment: entry.assessment,
        totalMarks: entry.totalMarks,
        createdAt: entry.createdAt ?? new Date().toISOString(),
        marks: entry.marks
          .map((mark) => ({
            studentId: studentByBackendId.get(mark.studentId) ?? 0,
            marks: mark.marks,
          }))
          .filter((mark) => mark.studentId !== 0),
      }));

      return {
        items,
        nextCursor: response.length === entriesPageSize ? pageParam + 1 : null,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 1,
  });

  const entries = useMemo(
    () => entriesData?.pages.flatMap((page) => page.items) ?? [],
    [entriesData],
  );

  const saveEntryMutation = useMutation({
    mutationFn: async (payload: GradebookSavePayload) => {
      return apiAuthRequest<BackendGradebookEntry>("/gradebook/entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-gradebook-entries", teacher.id],
      });
      toast.success("Gradebook entry saved.");
      setAssessment("");
      setActiveEntryId(created.id);
    },
    onError: () => {
      toast.error("Failed to save gradebook entry.");
    },
  });

  const updateEntryMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: GradebookSavePayload;
    }) => {
      return apiAuthRequest<BackendGradebookEntry>(
        `/gradebook/entries/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-gradebook-entries", teacher.id],
      });
      toast.success("Gradebook entry updated.");
    },
    onError: () => {
      toast.error("Failed to update gradebook entry.");
    },
  });

  const deleteEntryMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiAuthRequest<{ deleted: boolean; id: string }>(
        `/gradebook/entries/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-gradebook-entries", teacher.id],
      });
      setActiveEntryId(null);
      toast.success("Gradebook entry deleted.");
    },
    onError: () => {
      toast.error("Failed to delete gradebook entry.");
    },
  });

  const classStudents = useMemo(
    () => students.filter((s) => s.grade === selectedClass),
    [selectedClass, students],
  );

  const totalMarksNumber = Number(totalMarks);
  const totalPages = Math.max(1, Math.ceil(classStudents.length / pageSize));
  const pagedStudents = useMemo(() => {
    const start = (page - 1) * pageSize;
    return classStudents.slice(start, start + pageSize);
  }, [classStudents, page, pageSize]);

  const activeEntry = useMemo(
    () => entries.find((e) => e.id === activeEntryId) || null,
    [entries, activeEntryId],
  );

  useEffect(() => {
    if (!activeEntry) return;
    setSelectedClass(activeEntry.classGrade);
    setTerm(activeEntry.term);
    setAssessment(activeEntry.assessment);
    setTotalMarks(String(activeEntry.totalMarks));

    const nextMarksMap: Record<number, string> = {};
    activeEntry.marks.forEach((mark) => {
      nextMarksMap[mark.studentId] = String(mark.marks);
    });
    setMarksMap(nextMarksMap);
  }, [activeEntry]);

  useEffect(() => {
    const next: Record<number, string> = {};
    classStudents.forEach((s) => {
      next[s.id] = marksMap[s.id] ?? "";
    });
    setMarksMap(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [classStudents]);

  useEffect(() => {
    setPage(1);
  }, [selectedClass, classStudents.length]);

  const buildPayload = (): GradebookSavePayload | null => {
    if (!teacher.subject.trim()) {
      toast.error(
        "Teacher profile is still loading. Please retry in a moment.",
      );
      return null;
    }

    const total = Number(totalMarks);
    if (!selectedClass) {
      toast.error("Select a class to continue.");
      return null;
    }
    if (!assessment.trim()) {
      toast.error("Enter an assessment name.");
      return null;
    }
    if (Number.isNaN(total) || total <= 0) {
      toast.error("Total marks must be greater than 0.");
      return null;
    }

    if (!autoFillMissing) {
      const missing = classStudents.filter(
        (s) => marksMap[s.id] === "" || marksMap[s.id] === undefined,
      );
      if (missing.length > 0) {
        toast.error(
          "Enter marks for all students or enable auto-fill missing as 0.",
        );
        return null;
      }
    }

    const marks = classStudents.map((s) => {
      const raw = marksMap[s.id];
      const value = raw === "" ? 0 : Number(raw);
      return { studentId: s.id, marks: Number.isNaN(value) ? 0 : value };
    });

    const invalid = marks.find((m) => m.marks < 0 || m.marks > total);
    if (invalid) {
      toast.error(`Marks must be between 0 and ${total}.`);
      return null;
    }

    const studentBackendIdMap = new Map(
      classStudents
        .filter((student) => !!student.backendId)
        .map((student) => [student.id, student.backendId as string]),
    );

    if (marks.some((mark) => !studentBackendIdMap.get(mark.studentId))) {
      toast.error(
        "Some students are missing backend IDs. Refresh data and try again.",
      );
      return null;
    }

    return {
      subject: teacher.subject,
      classGrade: selectedClass,
      term,
      assessment: assessment.trim(),
      totalMarks: total,
      marks: marks.map((mark) => ({
        studentId: studentBackendIdMap.get(mark.studentId) as string,
        marks: mark.marks,
      })),
    };
  };

  const handleSave = async () => {
    const payload = buildPayload();
    if (!payload) return;
    saveEntryMutation.mutate(payload);
  };

  const handleUpdate = async () => {
    if (!activeEntry) {
      toast.error("Select an entry to update.");
      return;
    }

    const payload = buildPayload();
    if (!payload) return;
    updateEntryMutation.mutate({ id: activeEntry.id, payload });
  };

  const handleDelete = async () => {
    if (!activeEntry) {
      toast.error("Select an entry to delete.");
      return;
    }
    deleteEntryMutation.mutate(activeEntry.id);
  };

  const getStudent = (id: number) =>
    students.find((s) => s.id === id) as Student | undefined;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-2">
          <ClipboardList className="h-7 w-7 text-primary" /> Gradebook
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Enter marks by class, term, and assessment. Percentages and Cambridge grades are calculated automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main entry form */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Assessment Entry
              </h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Class</label>
                  <select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    {teacher.classes.length === 0 && (
                      <option value="">No classes assigned</option>
                    )}
                    {teacher.classes.map((clsId) => {
                      const classObj = allTeacherClasses.find(
                        (c) => c.id === clsId,
                      );
                      return (
                        <option key={clsId} value={clsId}>
                          {classObj ? classObj.name : clsId}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Term</label>
                  <input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder="e.g., Term 1 or Spring 2026"
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Assessment</label>
                  <input
                    value={assessment}
                    onChange={(e) => setAssessment(e.target.value)}
                    placeholder="e.g., Mid-Term Quiz"
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Total Marks</label>
                  <input
                    type="number"
                    min={1}
                    value={totalMarks}
                    onChange={(e) => setTotalMarks(e.target.value)}
                    className="w-full rounded-xl border border-border bg-muted/30 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  id="auto-fill-missing"
                  type="checkbox"
                  checked={autoFillMissing}
                  onChange={(e) => setAutoFillMissing(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary/20"
                />
                <label htmlFor="auto-fill-missing" className="text-xs">
                  Auto-fill missing marks as 0 when saving
                </label>
              </div>

              {/* Students marks table */}
              <div className="mt-6 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/20 rounded-xl">
                    <tr className="border-b border-border/60">
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Student</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Marks</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">%</th>
                      <th className="text-left p-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Grade</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {pagedStudents.map((s) => {
                      const raw = marksMap[s.id];
                      const hasValue = raw !== "" && raw !== undefined;
                      const numeric = hasValue ? Number(raw) : autoFillMissing ? 0 : NaN;
                      const safeMarks = Number.isNaN(numeric) ? null : numeric;
                      const percent =
                        safeMarks !== null && !Number.isNaN(totalMarksNumber) && totalMarksNumber > 0
                          ? (safeMarks / totalMarksNumber) * 100
                          : null;
                      const grade =
                        percent !== null ? percentageToCambridgeGrade(percent) : null;
                      return (
                        <tr key={s.id} className="hover:bg-muted/10 transition-colors">
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                                {s.avatar}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-foreground">{s.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  ID: STU-{String(s.id).padStart(4, "0")}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min={0}
                              value={marksMap[s.id] ?? ""}
                              onChange={(e) =>
                                setMarksMap((prev) => ({ ...prev, [s.id]: e.target.value }))
                              }
                              className="w-24 rounded-lg border border-border bg-muted/30 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                            />
                          </td>
                          <td className="p-3 text-sm text-muted-foreground font-mono">
                            {percent === null ? "—" : `${percent.toFixed(1)}%`}
                          </td>
                          <td className={`p-3 text-sm font-semibold ${grade ? cambridgeGradeColor(grade) : "text-muted-foreground"}`}>
                            {grade ?? "—"}
                          </td>
                        </tr>
                      );
                    })}
                    {classStudents.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                          No students in this class.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {classStudents.length > pageSize && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div>
                    Showing {(page - 1) * pageSize + 1}-
                    {Math.min(page * pageSize, classStudents.length)} of {classStudents.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={page === 1}
                    >
                      Previous
                    </button>
                    <span className="px-2">
                      Page {page} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1.5 rounded-lg border border-border hover:bg-muted/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={page === totalPages}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={handleSave}
                  disabled={
                    saveEntryMutation.isPending ||
                    updateEntryMutation.isPending ||
                    !selectedClass
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4" />
                  {saveEntryMutation.isPending || updateEntryMutation.isPending
                    ? "Saving..."
                    : "Save Marks"}
                </button>
                {activeEntry && (
                  <button
                    onClick={handleUpdate}
                    disabled={
                      saveEntryMutation.isPending ||
                      updateEntryMutation.isPending ||
                      !selectedClass
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/30 transition-all disabled:opacity-50"
                  >
                    <Pencil className="h-4 w-4" />
                    {saveEntryMutation.isPending ||
                    updateEntryMutation.isPending
                      ? "Updating..."
                      : "Update Selected"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right sidebar: Recent entries & entry details */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Entries */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" /> Recent Entries
              </h3>
            </div>
            <div className="p-4 max-h-80 overflow-y-auto scrollbar-thin">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No gradebook entries yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setActiveEntryId(entry.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-all ${
                        entry.id === activeEntryId
                          ? "border-primary/60 bg-primary/5 shadow-sm"
                          : "border-border/60 bg-background hover:border-primary/40 hover:shadow-sm"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">
                        {entry.assessment}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getClassName(entry.classGrade)} · {entry.term}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total: {entry.totalMarks} marks
                      </p>
                    </button>
                  ))}
                  {hasNextPage && (
                    <button
                      onClick={() => fetchNextPage()}
                      className="w-full rounded-xl border border-border px-4 py-2 text-xs text-muted-foreground hover:bg-muted/30 transition-colors disabled:opacity-50"
                    >
                      {entriesLoading ? "Loading..." : "Load More"}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Selected Entry Details */}
          {activeEntry && (
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Award className="h-4 w-4 text-primary" /> Entry Details
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2 text-sm">
                  <p className="font-medium text-foreground">
                    {activeEntry.assessment}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {getClassName(activeEntry.classGrade)} · {activeEntry.term}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Total Marks:{" "}
                    <span className="font-mono font-semibold">
                      {activeEntry.totalMarks}
                    </span>
                  </p>
                </div>
                <div className="mt-4 max-h-60 overflow-y-auto space-y-2 border-t border-border/60 pt-3">
                  {activeEntry.marks.map((m) => {
                    const student = getStudent(m.studentId);
                    const percent = (m.marks / activeEntry.totalMarks) * 100;
                    const grade = percentageToCambridgeGrade(percent);
                    return (
                      <div
                        key={m.studentId}
                        className="flex items-center justify-between py-1 border-b border-border/30 last:border-0"
                      >
                        <span className="text-sm text-foreground">
                          {student?.name || "Student"}
                        </span>
                        <div className="text-right">
                          <span className="text-sm text-muted-foreground font-mono">
                            {m.marks}/{activeEntry.totalMarks}
                          </span>
                          <span
                            className={`ml-2 text-xs font-semibold ${cambridgeGradeColor(grade)}`}
                          >
                            {grade}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-5 flex justify-end">
                  <button
                    onClick={handleDelete}
                    disabled={deleteEntryMutation.isPending}
                    className="inline-flex items-center gap-2 rounded-lg border border-destructive/40 px-3 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {deleteEntryMutation.isPending
                      ? "Deleting..."
                      : "Delete Entry"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherGradebook;