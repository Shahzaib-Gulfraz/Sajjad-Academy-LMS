import { useQuery } from "@tanstack/react-query";
import { apiAuthRequest } from "@/lib/api";

export type BackendTimetableSlot = {
  id: string;
  startDate?: string;
  endDate?: string;
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName?: string;
};

type Args = {
  weekStart?: string;
  weekEnd?: string;
  className?: string;
  teacherId?: string;
};

export const useTimetableSlots = ({ weekStart, weekEnd, className, teacherId }: Args) => {
  const qs = new URLSearchParams();
  if (weekStart) qs.set("weekStart", weekStart);
  if (weekEnd) qs.set("weekEnd", weekEnd);
  if (className) qs.set("className", className);
  if (teacherId) qs.set("teacherId", teacherId);

  const queryKey = ["timetable-slots", weekStart ?? "all", weekEnd ?? "all", className ?? "", teacherId ?? ""];

  return useQuery<BackendTimetableSlot[]>({
    queryKey,
    queryFn: async () => {
      const path = `/timetable/slots${qs.toString() ? `?${qs.toString()}` : ""}`;
      try {
        const rows = await apiAuthRequest<BackendTimetableSlot[]>(path);
        return rows;
      } catch (err) {
        return [];
      }
    },
    staleTime: 60 * 1000, // 1 minute
  });
};

export default useTimetableSlots;
