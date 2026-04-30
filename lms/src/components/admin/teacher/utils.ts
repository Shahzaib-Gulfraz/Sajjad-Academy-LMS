import { formatTeacherPortalId } from "@/lib/portal-ids";

export const GENDER_OPTIONS = ["Male", "Female", "Other"];

export const teacherCode = (id: number) => formatTeacherPortalId(id);

export const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "TR";
