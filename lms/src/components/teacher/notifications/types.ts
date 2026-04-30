import type { Teacher } from "@/types/domain";
import type { Student } from "@/types/domain";

export interface Props {
  teacher: Teacher;
  onNavigate: (nav: string) => void;
  students: Student[];
}

export interface Notification {
  id: string;
  type: "assignment" | "announcement" | "teacher-announcement";
  title: string;
  description: string;
  date: string;
  read: boolean;
  targetNav: string;
}

export interface TeacherAnnouncement {
  id: string;
  title: string;
  content: string;
  target: {
    type: "all" | "classes" | "students";
    classes?: string[];
    students?: number[];
  };
  date: string;
}

export interface AnnouncementFormState {
  title: string;
  content: string;
  targetType: "all" | "classes" | "students";
  selectedClasses: string[];
  selectedStudents: number[];
}
