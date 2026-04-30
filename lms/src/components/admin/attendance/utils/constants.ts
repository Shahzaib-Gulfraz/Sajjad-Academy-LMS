import { CalendarX2, CheckCircle, Clock, XCircle } from "lucide-react";
import type { AttendanceStatus } from "../types/attendance";

export const statusConfig: Record<
  AttendanceStatus,
  { icon: typeof CheckCircle; color: string; bg: string; border: string }
> = {
  Present: {
    icon: CheckCircle,
    color: "text-success",
    bg: "bg-success/10",
    border: "border-success/30",
  },
  Absent: {
    icon: XCircle,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
  },
  Late: {
    icon: Clock,
    color: "text-warning",
    bg: "bg-warning/10",
    border: "border-warning/30",
  },
  Leave: {
    icon: CalendarX2,
    color: "text-muted-foreground",
    bg: "bg-muted/40",
    border: "border-border",
  },
};

export const timeSlots = [
  "8:00 AM",
  "8:50 AM",
  "9:40 AM",
  "10:45 AM",
  "11:35 AM",
  "12:20 PM",
];

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri"];
