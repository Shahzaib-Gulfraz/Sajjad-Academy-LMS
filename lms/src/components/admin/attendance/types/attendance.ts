import type { Student } from "@/types/domain";

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Leave";

export type AttendanceRecord = {
  id: string;
  date: string;
  day: string;
  time: string;
  className: string;
  status: AttendanceStatus;
};

export type AdminAttendanceProps = {
  students?: Student[];
  allTeacherClasses?: { id: string; name: string }[];
  teacherSubmissions?: any[];
  classSummary?: any[];
  selectedClass?: string;
  setSelectedClass?: (val: string) => void;
  classOptions?: { label: string; value: string }[];
  searchQuery?: string;
  setSearchQuery?: (val: string) => void;
  filteredStudents?: Student[];
};
