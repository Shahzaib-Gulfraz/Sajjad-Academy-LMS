import { useEffect, useMemo, useState } from "react";
import { Filter } from "lucide-react";
import type { Teacher } from "@/types/domain";
import { toast } from "sonner";
import { apiAuthRequest } from "@/lib/api";
import useTimetableSlots from "@/hooks/use-timetable-slots";

type Props = {
  teacher: Teacher;
  allTeacherClasses?: { id: string; name: string }[];
};

type BackendTimetableSlot = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
};

const TeacherTimetable = ({ teacher, allTeacherClasses = [] }: Props) => {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const timetableQuery = useTimetableSlots({ teacherId: teacher.backendId });
  const slots = timetableQuery.data ?? [];
  const loading = timetableQuery.isLoading;

  useEffect(() => {
    if (slots.length > 0) {
      setSelectedClass((prev) => prev || teacher.classes?.[0] || slots[0]?.className || "");
    }
    if (!timetableQuery.isLoading && slots.length === 0) {
      // show toast only when loading finished and no slots found
      toast.error("Failed to load timetable.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timetableQuery.isLoading, slots.length]);

  const courses = useMemo(() => {
    const courseSet = new Set<string>();
    slots.forEach((slot) => courseSet.add(slot.className));
    // include teacher enrolled classes even if there are no slots for them
    (teacher.classes ?? []).forEach((id) => courseSet.add(id));
    const ids = Array.from(courseSet);
    const mapped = ids.map((id) => ({ id, label: allTeacherClasses.find((c) => c.id === id)?.name || id }));
    return mapped.sort((a, b) => a.label.localeCompare(b.label));
  }, [slots, allTeacherClasses]);

  const filteredRows = useMemo(() => {
    if (!selectedClass) return slots;
    return slots.filter((slot) => slot.className === selectedClass);
  }, [selectedClass, slots]);

  const formatDate = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="py-8 text-sm text-muted-foreground flex items-center gap-2">
        <span className="spinner h-4 w-4" />
        Loading timetable...
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header mb-0">
        <h2 className="section-title">Teacher Timetable</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="select-modern w-52"
            aria-label="Filter timetable by class"
          >
            <option value="">All Classes</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="card card-elevated overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[700px]">
            <thead>
              <tr>
                <th>
                  Date
                </th>
                <th>
                  Class
                </th>
                <th>
                  Subject
                </th>
                <th>
                  Time
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length > 0 ? (
                filteredRows.map((row) => (
                  <tr key={row.id}>
                    <td className="font-medium whitespace-nowrap">
                      {formatDate(row.date)}
                    </td>
                    <td>{allTeacherClasses.find((c) => c.id === row.className)?.name || row.className}</td>
                    <td>{row.subject}</td>
                    <td className="whitespace-nowrap">
                      {row.startTime} - {row.endTime}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="text-center text-muted-foreground">
                    No timetable slots found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedClass && (
        <p className="text-sm text-muted-foreground mt-4">
          Showing only rows for <span className="font-medium text-primary">{allTeacherClasses.find((c) => c.id === selectedClass)?.name || selectedClass}</span>.
        </p>
      )}
    </div>
  );
};

export default TeacherTimetable;
