import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { AdminTeacherRecord } from "@/components/admin/teacher/types";
import type { PlannerAllocation } from "@/components/admin/types";

interface Props {
  teachers: AdminTeacherRecord[];
  allocations: PlannerAllocation[];
  classOptions: string[];
  subjectOptions: string[];
  classSubjectOptions?: Record<string, string[]>;
  onAllocationsChange: (next: PlannerAllocation[]) => void;
  onLoadWeek?: (args: { weekStart: string; weekEnd: string }) => Promise<PlannerAllocation[]>;
  onLoadAll?: () => Promise<PlannerAllocation[]>;
  onCreateAllocation?: (slot: {
    startDate: string;
    endDate: string;
    date: string;
    startTime: string;
    endTime: string;
    className: string;
    subject: string;
    teacherId: number;
  }) => Promise<PlannerAllocation>;
  onUpdateAllocation?: (
    allocationId: string,
    slot: {
      startDate: string;
      endDate: string;
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      subject: string;
      teacherId: number;
    },
  ) => Promise<PlannerAllocation>;
  onDeleteAllocation?: (allocationId: string) => Promise<void>;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const toISODate = (date: Date) => date.toISOString().slice(0, 10);

const toMinutes = (value: string) => {
  const [hourRaw, minuteRaw] = value.split(":").map((part) => Number(part));
  if (!Number.isFinite(hourRaw) || !Number.isFinite(minuteRaw)) return 0;
  return hourRaw * 60 + minuteRaw;
};

const toPlannerDay = (dateValue: string): PlannerAllocation["day"] => {
  const day = new Date(`${dateValue}T00:00:00`).getDay();
  if (day === 1) return "Mon";
  if (day === 2) return "Tue";
  if (day === 3) return "Wed";
  if (day === 4) return "Thu";
  if (day === 5) return "Fri";
  return "Mon";
};

const getWeekRange = (baseDate: string) => {
  const date = new Date(`${baseDate}T00:00:00`);
  const day = date.getDay();
  // Treat Sunday as the start of the following week so selecting a Sunday
  // advances the view to the upcoming Monday (more intuitive for admins).
  const diffToMonday = day === 0 ? 1 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);
  return {
    weekStart: toISODate(weekStart),
    weekEnd: toISODate(weekEnd),
  };
};

const buildTimeSlots = () => {
  const result: string[] = [];
  for (let hour = 7; hour <= 16; hour += 1) {
    for (let minute = 0; minute < 60; minute += 15) {
      if (hour === 16 && minute > 0) continue;
      result.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
  }
  return result;
};

const TIME_SLOTS = buildTimeSlots();

const AdminTimetablePlanner = ({
  teachers,
  allocations,
  classOptions,
  subjectOptions,
  classSubjectOptions = {},
  onAllocationsChange,
  onLoadWeek,
  onLoadAll,
  onCreateAllocation,
  onUpdateAllocation,
  onDeleteAllocation,
}: Props) => {
  const today = toISODate(new Date());
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isWeekLoading, setIsWeekLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const weekRange = useMemo(() => getWeekRange(startDate), [startDate]);
  // Default to showing all slots so admins immediately see stored allocations
  const [showAllSlots, setShowAllSlots] = useState(true);

  const classSpecificSubjects = useMemo(() => {
    if (!className) return [];
    const configured = classSubjectOptions[className] ?? [];
    return configured.length > 0 ? configured : subjectOptions;
  }, [className, classSubjectOptions, subjectOptions]);

  const configuredSubjectsForClass = useMemo(
    () => (className ? classSubjectOptions[className] ?? [] : []),
    [className, classSubjectOptions],
  );

  const eligibleTeachers = useMemo(() => {
    if (!className || !subject) return teachers;
    return teachers.filter((teacher) => {
      if (!(teacher.classes ?? []).includes(className)) return false;
      const classSubjects = teacher.classSubjects?.[className] ?? [];
      if (classSubjects.length > 0) {
        return classSubjects.includes(subject);
      }
      return teacher.subject
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
        .includes(subject);
    });
  }, [className, subject, teachers]);

  const selectedTeacher = useMemo(
    () => teachers.find((teacher) => String(teacher.id) === teacherId) ?? null,
    [teacherId, teachers],
  );

  useEffect(() => {
    if (!teacherId) {
      if (eligibleTeachers.length === 1) {
        setTeacherId(String(eligibleTeachers[0].id));
      }
      return;
    }

    const isStillEligible = eligibleTeachers.some(
      (teacher) => String(teacher.id) === teacherId,
    );
    if (!isStillEligible) {
      setTeacherId(eligibleTeachers.length === 1 ? String(eligibleTeachers[0].id) : "");
    }
  }, [eligibleTeachers, teacherId]);

  const conflicts = useMemo(
    () =>
      allocations.filter((slot, idx) =>
        allocations.some(
          (other, j) =>
            j !== idx &&
            (slot.date ?? "") === (other.date ?? "") &&
            slot.teacherId === other.teacherId &&
            toMinutes(slot.startTime ?? "00:00") < toMinutes(other.endTime ?? "00:00") &&
            toMinutes(other.startTime ?? "00:00") < toMinutes(slot.endTime ?? "00:00") &&
            slot.className !== other.className,
        ),
      ),
    [allocations],
  );

  const sortedAllocations = useMemo(
    () =>
      [...allocations].sort((a, b) => {
        const dateCompare = (a.date ?? "").localeCompare(b.date ?? "");
        if (dateCompare !== 0) return dateCompare;
        return toMinutes(a.startTime ?? "00:00") - toMinutes(b.startTime ?? "00:00");
      }),
    [allocations],
  );

  const displayedAllocations = useMemo(() => {
    if (showAllSlots) return sortedAllocations;
    // Show allocations that overlap the current week using start/end dates
    return sortedAllocations.filter((slot) => {
      const slotStart = slot.startDate ?? slot.date ?? "";
      const slotEnd = slot.endDate ?? slot.date ?? "";
      return slotStart <= weekRange.weekEnd && slotEnd >= weekRange.weekStart;
    });
  }, [sortedAllocations, weekRange.weekEnd, weekRange.weekStart, showAllSlots]);

  const missingCoursesForClass =
    className.length > 0 && (classSubjectOptions[className] ?? []).length === 0;

  const disableSave =
    !className || !subject || !teacherId || !startDate || !endDate || !startTime || !endTime || missingCoursesForClass;

  const teacherHelperText = useMemo(() => {
    if (!className) return "Choose a class first.";
    if (missingCoursesForClass) return `Add courses to ${className} before creating timetable slots.`;
    if (!subject) return "Choose a subject to see matching teachers.";
    if (eligibleTeachers.length === 0) {
      return `No teacher is assigned to teach ${subject} in ${className}. Update teacher class-course assignments first.`;
    }
    if (eligibleTeachers.length === 1) {
      return `${eligibleTeachers[0].name} is the only teacher currently eligible, so we selected them for you.`;
    }
    return `${eligibleTeachers.length} teachers can teach ${subject} in ${className}.`;
  }, [className, eligibleTeachers, missingCoursesForClass, subject]);

  const resetForm = () => {
    setEditingId(null);
    setStartDate(weekRange.weekStart);
    setEndDate(weekRange.weekEnd);
    setStartTime("08:00");
    setEndTime("08:45");
    setClassName("");
    setSubject("");
    setTeacherId("");
  };

  const loadWeek = async (baseDate: string) => {
    if (!onLoadWeek) return;
    setIsWeekLoading(true);
    try {
      await onLoadWeek(getWeekRange(baseDate));
    } catch {
      toast.error("Failed to load timetable week from server.");
    } finally {
      setIsWeekLoading(false);
    }
  };

  useEffect(() => {
    if (!showAllSlots) return;
    // If parent provided a load-all handler, use it to fetch all slots from backend
    const loadAll = async () => {
      if (!onLoadAll) return;
      setIsWeekLoading(true);
      try {
        const rows = await onLoadAll();
        onAllocationsChange(rows);
      } catch {
        toast.error("Failed to load all timetable slots from server.");
      } finally {
        setIsWeekLoading(false);
      }
    };

    void loadAll();
  }, [showAllSlots, onLoadAll, onAllocationsChange]);

  const applyAllocation = async () => {
    if (isSaving) return;

    const numericTeacherId = Number(teacherId);
    const selectedTeacher = teachers.find((t) => t.id === numericTeacherId);
    if (!selectedTeacher || !className || !subject || !startDate || !endDate || !startTime || !endTime) {
      toast.error("Select teacher, class, subject, date range, and time range.");
      return;
    }

    if (endDate < startDate) {
      toast.error("End date must be the same as or later than start date.");
      return;
    }

    if (toMinutes(endTime) <= toMinutes(startTime)) {
      toast.error("End time must be later than start time.");
      return;
    }

    const hasClassConflict = allocations.some(
      (slot) =>
        slot.id !== editingId &&
        (slot.startDate ?? slot.date ?? "") <= endDate &&
        (slot.endDate ?? slot.date ?? "") >= startDate &&
        slot.className === className &&
        toMinutes(startTime) < toMinutes(slot.endTime ?? "00:00") &&
        toMinutes(slot.startTime ?? "00:00") < toMinutes(endTime),
    );

    const hasTeacherConflict = allocations.some(
      (slot) =>
        slot.id !== editingId &&
        (slot.startDate ?? slot.date ?? "") <= endDate &&
        (slot.endDate ?? slot.date ?? "") >= startDate &&
        slot.teacherId === selectedTeacher.id &&
        toMinutes(startTime) < toMinutes(slot.endTime ?? "00:00") &&
        toMinutes(slot.startTime ?? "00:00") < toMinutes(endTime),
    );

    if (hasClassConflict || hasTeacherConflict) {
      toast.error("Time conflict detected. Choose another slot.");
      return;
    }

    const payload = {
      startDate,
      endDate,
      date: startDate,
      startTime,
      endTime,
      className,
      subject,
      teacherId: selectedTeacher.id,
    };

    setIsSaving(true);
    try {
      if (editingId) {
        if (onUpdateAllocation) {
          const updated = await onUpdateAllocation(editingId, payload);
          onAllocationsChange(
            allocations.map((slot) => (slot.id === editingId ? updated : slot)),
          );
        } else {
          onAllocationsChange(
            allocations.map((slot) =>
              slot.id === editingId
                ? {
                    ...slot,
                    day: toPlannerDay(startDate),
                    startDate,
                    endDate,
                    date: startDate,
                    startTime,
                    endTime,
                    time: `${startTime} - ${endTime}`,
                    className,
                    subject,
                    teacherId: selectedTeacher.id,
                    teacherName: selectedTeacher.name,
                  }
                : slot,
            ),
          );
        }
        toast.success("Allocation updated.");
      } else {
        if (onCreateAllocation) {
          const created = await onCreateAllocation(payload);
          onAllocationsChange([created, ...allocations]);
        } else {
          const next: PlannerAllocation = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            day: toPlannerDay(startDate),
            startDate,
            endDate,
            date: startDate,
            startTime,
            endTime,
            time: `${startTime} - ${endTime}`,
            className,
            subject,
            teacherId: selectedTeacher.id,
            teacherName: selectedTeacher.name,
          };
          onAllocationsChange([next, ...allocations]);
        }
        toast.success("Allocation added without conflicts.");
      }

      resetForm();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to save allocation.";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const removeAllocation = async (allocationId: string) => {
    if (deletingId) return;

    setDeletingId(allocationId);
    try {
      if (onDeleteAllocation) {
        await onDeleteAllocation(allocationId);
      } else {
        onAllocationsChange(allocations.filter((x) => x.id !== allocationId));
      }
      if (editingId === allocationId) {
        resetForm();
      }
      toast.success("Allocation removed.");
    } catch {
      toast.error("Unable to delete allocation.");
    } finally {
      setDeletingId(null);
    }
  };

  const startEdit = (slot: PlannerAllocation) => {
    setEditingId(slot.id);
    setStartDate(slot.startDate ?? slot.date ?? weekRange.weekStart);
    setEndDate(slot.endDate ?? slot.date ?? weekRange.weekStart);
    setStartTime(slot.startTime ?? "08:00");
    setEndTime(slot.endTime ?? "08:45");
    setClassName(slot.className);
    setSubject(slot.subject);
    setTeacherId(String(slot.teacherId));
  };

  const formattedDate = (value: string) => {
    const d = new Date(`${value}T00:00:00`);
    const day = DAYS[d.getDay()] ?? "Mon";
    return `${day} ${value}`;
  };

  const weekBadgeText = `${formattedDate(weekRange.weekStart)} to ${formattedDate(weekRange.weekEnd)}`;

  const formatRangeLabel = (from?: string, to?: string) => {
    if (!from) return "—";
    if (!to || from === to) return formattedDate(from);
    return `${formattedDate(from)} to ${formattedDate(to)}`;
  };

  const activeClasses = useMemo(
    () => new Set(displayedAllocations.map((slot) => slot.className)).size,
    [displayedAllocations],
  );

  const formInputClass =
    "h-11 w-full rounded-xl border border-border/80 bg-background/90 px-3 text-sm text-foreground shadow-sm transition-all duration-200 placeholder:text-muted-foreground/80 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30";

  const subtlePanelClass =
    "rounded-2xl border border-border/80 bg-card/90 p-4 shadow-[0_10px_30px_-18px_hsl(var(--foreground)/0.35)] backdrop-blur-sm";

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card to-muted/40 p-4 shadow-[0_16px_40px_-24px_hsl(var(--foreground)/0.45)] sm:p-6">
        <div className="pointer-events-none absolute -right-16 -top-20 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 -left-16 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Timetable + Workload Planner
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build weekly class schedules, prevent overlaps, and assign the right teacher quickly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              Week: {weekBadgeText}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              {displayedAllocations.length} slot{displayedAllocations.length === 1 ? "" : "s"}
            </span>
            <span className="inline-flex items-center rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur-sm">
              {activeClasses} active class{activeClasses === 1 ? "" : "es"}
            </span>
            <button
              onClick={() => setShowAllSlots((v) => !v)}
              className={`ml-2 inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                showAllSlots ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-background text-muted-foreground'
              }`}
            >
              {showAllSlots ? 'Showing All' : 'Show All'}
            </button>
          </div>
        </div>
      </div>

      <section className={`${subtlePanelClass} space-y-4`}>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-semibold text-foreground">Create Allocation</h2>
          <p className="text-xs text-muted-foreground">
            {isWeekLoading ? "Loading selected week..." : "All fields use 15-minute intervals."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Date</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                void loadWeek(e.target.value);
              }}
              className={formInputClass}
              title="Start date picker"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Date</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className={formInputClass}
              title="End date picker"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start Time</span>
            <select
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={formInputClass}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={`start-${slot}`} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">End Time</span>
            <select
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={formInputClass}
            >
              {TIME_SLOTS.map((slot) => (
                <option key={`end-${slot}`} value={slot}>
                  {slot}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class</span>
            <select
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
                setSubject("");
                setTeacherId("");
              }}
              className={formInputClass}
            >
              <option value="">Select class</option>
              {classOptions.map((cn) => (
                <option key={cn} value={cn}>
                  {cn}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Subject</span>
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setTeacherId("");
              }}
              className={formInputClass}
              disabled={!className || missingCoursesForClass}
            >
              <option value="">Select subject</option>
              {classSpecificSubjects.map((sn) => (
                <option key={sn} value={sn}>
                  {sn}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <label className="space-y-1.5">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Teacher</span>
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className={formInputClass}
              disabled={!className || !subject}
            >
              <option value="">Select teacher</option>
              {eligibleTeachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name} ({teacher.classes.join(", ")})
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-border/80 bg-muted/30 px-3 py-3 text-xs leading-5 text-muted-foreground">
            {teacherHelperText}
            {className && configuredSubjectsForClass.length === 0 && (
              <div className="mt-1.5 text-destructive">
                No class-course mapping found for {className}. Configure it first in Teacher Administration.
              </div>
            )}
          </div>
        </div>

        {selectedTeacher && (
          <div className="animate-[fade-in-up_300ms_ease-out] rounded-xl border border-primary/20 bg-primary/10 px-4 py-3">
            <p className="text-sm font-semibold text-foreground">{selectedTeacher.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Classes: {selectedTeacher.classes.join(", ") || "None"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Courses for {className || "selected class"}: {" "}
              {className
                ? (selectedTeacher.classSubjects?.[className] ?? [])
                    .filter(Boolean)
                    .join(", ") || selectedTeacher.subject || "None"
                : selectedTeacher.subject || "None"}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => {
              void applyAllocation();
            }}
            disabled={disableSave || isSaving}
            className="inline-flex h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:translate-y-[-1px] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : editingId ? "Save Changes" : "Add Allocation"}
          </button>
          {editingId && (
            <button
              onClick={resetForm}
              className="inline-flex h-10 items-center justify-center rounded-xl border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancel Edit
            </button>
          )}
        </div>
      </section>

      <section className={subtlePanelClass}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-base font-semibold text-foreground">Conflict Alerts</p>
          <span
            className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${
              conflicts.length > 0
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-border bg-background text-muted-foreground"
            }`}
          >
            {conflicts.length}
          </span>
        </div>

        <div className="space-y-2">
          {conflicts.length === 0 && (
            <div className="rounded-xl border border-border/80 bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
              No scheduling conflicts detected in this week.
            </div>
          )}

          {conflicts.map((slot) => (
            <div
              key={`conflict-${slot.id}`}
              className="animate-[fade-in-up_250ms_ease-out] rounded-xl border border-destructive/35 bg-destructive/10 px-4 py-3 text-sm text-foreground"
            >
              <span className="font-medium">{slot.teacherName}</span> has overlapping classes on {slot.date} ({slot.startTime} to {slot.endTime}).
            </div>
          ))}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border/80 bg-card/95 shadow-[0_12px_30px_-20px_hsl(var(--foreground)/0.45)]">
          <div className="flex flex-col gap-2 border-b border-border/80 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {showAllSlots
              ? `Showing ${displayedAllocations.length} allocation${displayedAllocations.length === 1 ? "" : "s"} (All)`
              : `Showing ${displayedAllocations.length} allocation${displayedAllocations.length === 1 ? "" : "s"} for ${weekBadgeText}`}
          </p>
          <p className="text-xs text-muted-foreground">Tap a row action to edit or remove a slot.</p>
        </div>

        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[880px]">
            <thead className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm">
              <tr className="border-b border-border/80">
                {["Day", "Period", "Time", "Class", "Subject", "Teacher", "Actions"].map((head) => (
                  <th key={head} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayedAllocations.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No allocations yet for this week. Add your first slot using the form above.
                  </td>
                </tr>
              )}

              {displayedAllocations.map((slot) => (
                <tr
                  key={slot.id}
                  className="border-b border-border/70 transition-colors duration-200 hover:bg-muted/30 last:border-0"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {slot.day ?? toPlannerDay(slot.date ?? weekRange.weekStart)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatRangeLabel(slot.startDate, slot.endDate)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {slot.startTime} - {slot.endTime}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{slot.className}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{slot.subject}</td>
                  <td className="px-4 py-3 text-sm text-foreground">{slot.teacherName}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEdit(slot)}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          void removeAllocation(slot.id);
                        }}
                        disabled={deletingId === slot.id}
                        className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingId === slot.id ? "Removing..." : "Remove"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default AdminTimetablePlanner;
