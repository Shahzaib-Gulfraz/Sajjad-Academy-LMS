import { useQuery } from "@tanstack/react-query";
export interface TimetableEntry {
  time: string;
  mon?: string;
  tue?: string;
  wed?: string;
  thu?: string;
  fri?: string;
  sat?: string;
  // Metadata for date ranges
  dateRanges?: Map<string, { startDate?: string; endDate?: string }>;
}
import { apiAuthRequest } from "@/lib/api";

type BackendStudent = {
  id: string;
  grade: string;
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
  startDate?: string;
  endDate?: string;
};

type TimetableSlotView = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  subject: string;
  className: string;
  startDate?: string;
  endDate?: string;
};

const toISODate = (value: Date) => value.toISOString().slice(0, 10);

const getCurrentWeekRange = () => {
  const date = new Date();
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  return {
    weekStart: toISODate(weekStart),
    weekEnd: toISODate(weekEnd),
  };
};

const toTimeLabel = (startTime: string, endTime: string) =>
  `${startTime} - ${endTime}`;

const mapSlotsToRows = (slots: TimetableSlotView[]): TimetableEntry[] => {
  const byTime = new Map<string, TimetableEntry>();

  for (const slot of slots) {
    const day = new Date(`${slot.date}T00:00:00`).getDay();
    const time = toTimeLabel(slot.startTime, slot.endTime);
    const existing = byTime.get(time) ?? { 
      time,
      dateRanges: new Map<string, { startDate?: string; endDate?: string }>()
    };

    // Subject is already resolved by backend, just use directly
    const displaySubject = slot.subject;

    // Store date range info per subject
    if (!existing.dateRanges) existing.dateRanges = new Map();
    existing.dateRanges.set(displaySubject, {
      startDate: slot.startDate,
      endDate: slot.endDate,
    });

    if (day === 1) existing.mon = displaySubject;
    if (day === 2) existing.tue = displaySubject;
    if (day === 3) existing.wed = displaySubject;
    if (day === 4) existing.thu = displaySubject;
    if (day === 5) existing.fri = displaySubject;
    if (day === 6) existing.sat = displaySubject;

    byTime.set(time, existing);
  }

  return Array.from(byTime.values()).sort((a, b) =>
    a.time.localeCompare(b.time),
  );
};

export const useTimetable = () => {
  const { data: resolvedData = { timetable: [], classNames: new Set<string>() }, isLoading } = useQuery({
    queryKey: ["student-timetable"],
    queryFn: async () => {
      const student = await apiAuthRequest<BackendStudent>("/students/me");
      const { weekStart, weekEnd } = getCurrentWeekRange();

      // Fetch timetable slots - backend now returns resolved names!
      const rows = await apiAuthRequest<BackendTimetableSlot[]>(
        `/timetable/slots?weekStart=${weekStart}&weekEnd=${weekEnd}&className=${encodeURIComponent(student.grade)}`,
      );

      // Extract unique class names and map slots
      const classNames = new Set<string>();
      const slots = rows.map((slot) => {
        // Backend already resolved className and subject names
        if (slot.className) classNames.add(slot.className);
        return {
          id: slot.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          subject: slot.subject, // Already resolved by backend
          className: slot.className, // Already resolved by backend
          startDate: slot.startDate, // New: Course start date
          endDate: slot.endDate, // New: Course end date
        };
      });

      const timetable = mapSlotsToRows(slots);
      return { timetable, classNames };
    },
  });

  return {
    timetable: resolvedData.timetable,
    classNames: Array.from(resolvedData.classNames),
    isLoading,
  };
};
