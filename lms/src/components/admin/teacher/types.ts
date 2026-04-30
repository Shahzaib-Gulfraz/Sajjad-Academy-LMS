import type { Teacher } from "@/types/domain";

export type AdminTeacherRecord = Teacher & {
  classSubjects?: Record<string, string[]>;
};

export type ClassSubjectForm = {
  classes: string[];
  classSubjects: Record<string, string[]>;
};
