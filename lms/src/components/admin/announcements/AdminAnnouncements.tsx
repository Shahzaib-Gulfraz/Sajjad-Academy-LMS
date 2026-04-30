import { useMemo } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { Announcement, Student } from "@/types/domain";
import TeacherAnnouncements from "@/components/teacher/announcements/TeacherAnnouncements";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";
import { toast } from "sonner";

type BackendAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  authorName: string;
  publishedAt: string;
};

const toNumber = (value: string, fallback: number): number => {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const mapAnnouncement = (
  announcement: BackendAnnouncement,
  fallbackIndex: number
): Announcement => ({
  id: toNumber(announcement.id, fallbackIndex + 1),
  title: announcement.title,
  date: announcement.publishedAt.slice(0, 10),
  priority: announcement.priority,
  content: announcement.content,
  author: announcement.authorName,
});

interface Props {
  announcements: Announcement[];
  students: Student[];
  onAnnouncementsChange: Dispatch<SetStateAction<Announcement[]>>;
}

const AdminAnnouncements = ({
  announcements,
  students,
  onAnnouncementsChange,
}: Props) => {
  const classes = useMemo(
    () => Array.from(new Set(students.map((student) => student.grade))).sort(),
    [students]
  );
  const receivedAnnouncements = useMemo(() => announcements, [announcements]);

  // Admin sees all announcements they authored in the history list (which we map to receivedAnnouncements)
  // We can just label it Announcements History by modifying TeacherAnnouncements or just using the default.
  
  return (
    <TeacherAnnouncements
      senderName="Admin Office"
      classes={classes}
      students={students}
      receivedAnnouncements={receivedAnnouncements}
      allStudentsLabel="All Students"
      hideReceived={false} // Show the history here
      lockTargetAll={false}
      onAnnouncementCreated={async (announcement, target) => {
        try {
          const created = await apiAuthRequest<BackendAnnouncement>("/announcements", {
            method: "POST",
            body: JSON.stringify({
              title: announcement.title,
              content: announcement.content,
              priority:
                announcement.priority === "high" || announcement.priority === "low"
                  ? announcement.priority
                  : "medium",
              targetType: target.targetType,
              targetClasses: target.targetClasses,
              targetStudentIds: target.targetStudentIds,
            }),
          });

          onAnnouncementsChange((prev) => [mapAnnouncement(created, prev.length), ...prev]);
        } catch (error) {
          if (error instanceof ApiRequestError) {
            toast.error(error.message);
          } else {
            toast.error("Failed to publish announcement.");
          }
          throw error;
        }
      }}
    />
  );
};

export default AdminAnnouncements;
