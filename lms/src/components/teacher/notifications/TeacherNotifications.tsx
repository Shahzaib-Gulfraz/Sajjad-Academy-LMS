import { useState, useRef, useEffect, useMemo } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { apiAuthRequest } from "@/lib/api";
import NotificationsDropdown from "@/components/teacher/notifications/components/NotificationsDropdown";
import CreateAnnouncementModal from "@/components/teacher/notifications/components/CreateAnnouncementModal";
import useOutsideClick from "@/components/teacher/notifications/hooks/useOutsideClick";
import type {
  AnnouncementFormState,
  Notification,
  TeacherAnnouncement,
  Props,
} from "@/components/teacher/notifications/types";
import {
  buildInitialNotifications,
  buildTeacherAnnouncementNotifications,
} from "@/components/teacher/notifications/utils";

const TeacherNotifications = ({ teacher, onNavigate, students }: Props) => {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [teacherAnnouncements, setTeacherAnnouncements] = useState<TeacherAnnouncement[]>([]);

  // Form state for new announcement
  const [form, setForm] = useState<AnnouncementFormState>({
    title: "",
    content: "",
    targetType: "all" as "all" | "classes" | "students",
    selectedClasses: [] as string[],
    selectedStudents: [] as number[],
  });

  // Build notifications from assignments, system announcements, and teacher's own announcements
  const [notifications, setNotifications] = useState<Notification[]>(() =>
    buildInitialNotifications()
  );

  useEffect(() => {
    let mounted = true;

    const loadNotifications = async () => {
      try {
        const data = await apiAuthRequest<Notification[]>("/notifications");
        if (!mounted) return;
        setNotifications(data);
      } catch {
        if (!mounted) return;
        setNotifications([]);
      }
    };

    void loadNotifications();
    return () => {
      mounted = false;
    };
  }, []);

  // Update notifications when teacher creates a new announcement
  useEffect(() => {
    const teacherNotifs = buildTeacherAnnouncementNotifications(teacherAnnouncements);

    setNotifications((prev) => {
      const filtered = prev.filter((n) => !n.id.startsWith("teacher-ann-"));
      return [...teacherNotifs, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
    });
  }, [teacherAnnouncements]);

  const ref = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useOutsideClick(ref, () => setOpen(false), open);
  useOutsideClick(modalRef, () => setModalOpen(false), modalOpen);

  const handleClick = async (n: Notification) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    try {
      await apiAuthRequest<{ userId: string; notificationId: string; read: boolean }>(
        "/notifications/read",
        {
          method: "PATCH",
          body: JSON.stringify({ notificationId: n.id }),
        },
      );
    } catch {
      // Keep optimistic UI state on transient API failures.
    }
    onNavigate(n.targetNav);
    setOpen(false);
  };

  const markAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await apiAuthRequest<{ updated: number }>("/notifications/read-all", {
        method: "PATCH",
        body: JSON.stringify({
          notificationIds: notifications.map((notification) => notification.id),
        }),
      });
    } catch {
      // Keep optimistic UI state on transient API failures.
    }
  };

  // Get teacher's classes and students
  const teacherClasses = useMemo(() => teacher.classes || [], [teacher.classes]);
  const studentsInTeacherClasses = useMemo(
    () => students.filter((s) => teacherClasses.includes(s.grade)),
    [students, teacherClasses]
  );

  const handleCreateAnnouncement = () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    let targetDescription = "";
    if (form.targetType === "all") {
      targetDescription = `All students in ${teacherClasses.join(", ")}`;
    } else if (form.targetType === "classes") {
      if (form.selectedClasses.length === 0) {
        toast.error("Select at least one class");
        return;
      }
      targetDescription = `Classes: ${form.selectedClasses.join(", ")}`;
    } else {
      if (form.selectedStudents.length === 0) {
        toast.error("Select at least one student");
        return;
      }
      const studentNames = studentsInTeacherClasses
        .filter((s) => form.selectedStudents.includes(s.id))
        .map((s) => s.name)
        .join(", ");
      targetDescription = `Students: ${studentNames}`;
    }

    const newAnnouncement: TeacherAnnouncement = {
      id: Date.now().toString(),
      title: form.title,
      content: form.content,
      target: {
        type: form.targetType,
        classes: form.targetType === "classes" ? form.selectedClasses : undefined,
        students: form.targetType === "students" ? form.selectedStudents : undefined,
      },
      date: new Date().toISOString().split("T")[0],
    };

    setTeacherAnnouncements((prev) => [newAnnouncement, ...prev]);

    toast.success(`Announcement sent to ${targetDescription}`);

    // Reset form and close modal
    setForm({ title: "", content: "", targetType: "all", selectedClasses: [], selectedStudents: [] });
    setModalOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative text-muted-foreground hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationsDropdown
        open={open}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAllRead={markAllRead}
        onCreateAnnouncement={() => setModalOpen(true)}
        onClickNotification={handleClick}
      />
      {/* Create Announcement Modal */}
      <CreateAnnouncementModal
        open={modalOpen}
        modalRef={modalRef}
        form={form}
        teacherClasses={teacherClasses}
        studentsInTeacherClasses={studentsInTeacherClasses}
        onClose={() => setModalOpen(false)}
        onFormChange={setForm}
        onSubmit={handleCreateAnnouncement}
      />
    </div>
  );
};

export default TeacherNotifications;


