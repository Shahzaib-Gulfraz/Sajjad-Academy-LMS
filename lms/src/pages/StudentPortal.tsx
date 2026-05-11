import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  UserCheck,
  ClipboardList,
  Calendar,
  User,
  CalendarOff,
  Megaphone,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import StudentDashboard from "@/components/student/dashboard/components/StudentDashboard";
import StudentProfile from "@/components/student/profile/components/StudentProfile";
import StudentGrades from "@/components/student/grades/components/StudentGrades";
import StudentAttendance from "@/components/student/attendance/components/StudentAttendance";
import StudentAssignments from "@/components/student/assignments/components/StudentAssignments";
import StudentTimetable from "@/components/student/timetable/components/StudentTimetable";
import StudentLeave from "@/components/student/leave/components/StudentLeave";
import NotificationBell from "@/components/student/notifications/components/NotificationBell";
import StudentQuizzes from "@/components/student/quizzes/StudentQuizzes";
import { apiAuthRequest } from "@/lib/api";
import { EmptyState, SectionLoader } from "@/components/ui/states";
import type {
  PortalStudent,
  PortalAnnouncement,
} from "@/components/student/types";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "materials", label: "Materials", icon: BookOpen },
  { id: "grades", label: "My Grades", icon: FileText },
  { id: "attendance", label: "Attendance", icon: UserCheck },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "quizzes", label: "Quizzes", icon: ClipboardCheck },
  { id: "timetable", label: "Timetable", icon: Calendar },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "profile", label: "My Profile", icon: User },
  { id: "leave", label: "Apply for Leave", icon: CalendarOff },
];

// Backend type definitions
type BackendStudent = {
  id: string;
  admissionNo: string;
  name: string;
  email: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  status: string;
  avatarUrl?: string;
};

type BackendAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  authorName: string;
  publishedAt: string;
};

// Helper functions
const initials = (name: string): string =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

// Mapping functions
const mapStudent = (student: BackendStudent): PortalStudent => {
  return {
    id: student.id,
    admissionNo: student.admissionNo,
    name: student.name,
    email: student.email,
    grade: student.grade,
    avatar: initials(student.name),
    gender: student.gender ?? "",
    dob: student.dob ?? "",
    phone: student.phone ?? "",
    guardian: student.guardian,
    guardianPhone: student.guardianPhone,
    address: student.address ?? "",
    status: student.status,
    avatarUrl: student.avatarUrl,
  };
};

const mapAnnouncement = (
  announcement: BackendAnnouncement,
): PortalAnnouncement => ({
  id: announcement.id,
  title: announcement.title,
  date: announcement.publishedAt.slice(0, 10),
  priority: announcement.priority,
  content: announcement.content,
  author: announcement.authorName,
});

const StudentPortal = () => {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [student, setStudent] = useState<PortalStudent | null>(null);
  const [announcementLimit, setAnnouncementLimit] = useState(6);

  const {
    data,
    isLoading,
    isError: hasLoadError,
  } = useQuery({
    queryKey: ["student-portal-data"],
    queryFn: async () => {
      const [studentRes, announcementRes] = await Promise.all([
        apiAuthRequest<BackendStudent>("/students/me"),
        apiAuthRequest<BackendAnnouncement[]>("/announcements").catch(() => []),
      ]);

      return {
        student: mapStudent(studentRes),
        announcements: announcementRes.map(mapAnnouncement),
      };
    },
  });

  const announcements = data?.announcements ?? [];

  useEffect(() => {
    setStudent(data?.student ?? null);
  }, [data?.student]);

  // Navigation handler
  const handleNavChange = (nav: string) => {
    navigate(`/student/${nav}`);
  };

  // Allowed sections
  const allowedSections = useMemo(() => new Set(navItems.map((item) => item.id)), []);
  const activeNav = allowedSections.has(section ?? "")
    ? (section as string)
    : "dashboard";

  // Section validation
  useEffect(() => {
    if (!section || !allowedSections.has(section)) {
      navigate("/student/dashboard", { replace: true });
    }
  }, [allowedSections, navigate, section]);

  // Announcement limit reset
  useEffect(() => {
    if (activeNav === "announcements") {
      setAnnouncementLimit(6);
    }
  }, [activeNav]);

  // Custom notification slot with profile icon
  const notificationSlot = student ? (
    <div className="flex items-center gap-3">
      <button
        onClick={() => handleNavChange("profile")}
        className="btn-outline btn-icon h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
        title="My Profile"
        aria-label="Open my profile"
      >
        <User className="h-5 w-5 text-primary" />
      </button>
      <NotificationBell student={student} onNavigate={handleNavChange} />
    </div>
  ) : null;

  const renderContent = () => {
    if (!student) return null;

    switch (activeNav) {
      case "dashboard":
        return (
          <StudentDashboard
            student={student}
            announcements={announcements}
            onNavigate={handleNavChange}
          />
        );
      case "profile":
        return (
          <StudentProfile
            student={student}
            onProfileUpdated={(next) => {
              setStudent((prev) => (prev ? { ...prev, ...next } : null));
            }}
          />
        );
      case "grades":
        return <StudentGrades student={student} />;
      case "attendance":
        return <StudentAttendance student={student} />;
      case "assignments":
        return <StudentAssignments student={student} />;
      case "timetable":
        return <StudentTimetable />;
      case "leave":
        return <StudentLeave />;
      case "materials":
        return (
          <div className="rounded-2xl border border-border/60 bg-card p-6 text-sm text-muted-foreground">
            Learning materials are being consolidated into the class materials area.
          </div>
        );
      case "quizzes":
        return <StudentQuizzes student={student} />;
      case "announcements":
        return (
          <section className="space-y-6 animate-fade-in max-w-5xl mx-auto px-4 sm:px-6 py-6">
            <div className="text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-2">
                <Megaphone className="h-7 w-7 text-primary" /> Announcements
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                Latest updates from teachers and administration.
              </p>
            </div>

            <div className="space-y-4">
              {announcements.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
                  <Megaphone className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">No announcements yet</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-sm">
                    Check back later or contact your teacher for updates.
                  </p>
                </div>
              )}

              {announcements.slice(0, announcementLimit).map((a) => (
                <div
                  key={a.id}
                  className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 p-5"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative flex items-start gap-4">
                    <div
                      className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ring-1 ${
                        a.priority === "high"
                          ? "bg-destructive ring-destructive/20"
                          : a.priority === "medium"
                          ? "bg-warning ring-warning/20"
                          : "bg-muted-foreground ring-muted-foreground/20"
                      }`}
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground text-base">{a.title}</h3>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span>{a.date}</span>
                        <span>•</span>
                        <span>{a.author}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                        {a.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {announcements.length > announcementLimit && (
                <div className="flex justify-center pt-4">
                  <button
                    onClick={() => setAnnouncementLimit((prev) => prev + 6)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/30 transition-all hover:shadow-sm"
                  >
                    Show more announcements <span className="text-muted-foreground">(↓)</span>
                  </button>
                </div>
              )}
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  if (hasLoadError) {
    return (
      <PortalLayout
        role="Student"
        userName="Error"
        userAvatar="!"
        navItems={navItems}
        activeNav={activeNav}
        onNavChange={handleNavChange}
      >
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="rounded-full bg-destructive/10 p-4 mb-4">
            <Megaphone className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Unable to load student data</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Make sure you are logged in as a student. If the issue persists, contact administration.
          </p>
        </div>
      </PortalLayout>
    );
  }

  if (isLoading || !student) {
    return (
      <PortalLayout
        role="Student"
        userName="Loading..."
        userAvatar="..."
        navItems={navItems}
        activeNav={activeNav}
        onNavChange={handleNavChange}
      >
        <SectionLoader label="Loading student workspace..." />
      </PortalLayout>
    );
  }

  return (
    <PortalLayout
      role="Student"
      userName={student.name}
      userAvatar={student.avatar}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={handleNavChange}
      notificationSlot={notificationSlot}
    >
      <div className="space-y-6 animate-fade-in">
        {renderContent()}
      </div>
    </PortalLayout>
  );
};

export default StudentPortal;