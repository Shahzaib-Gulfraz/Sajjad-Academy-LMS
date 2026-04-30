import type { Notification, TeacherAnnouncement } from "./types";

export const buildInitialNotifications = (): Notification[] => [];

export const buildTeacherAnnouncementNotifications = (
  teacherAnnouncements: TeacherAnnouncement[]
): Notification[] => {
  return teacherAnnouncements.map((a) => ({
    id: `teacher-ann-${a.id}`,
    type: "teacher-announcement",
    title: `You announced: ${a.title}`,
    description: `${a.content.slice(0, 60)}...`,
    date: a.date,
    read: false,
    targetNav: "announcements",
  }));
};
