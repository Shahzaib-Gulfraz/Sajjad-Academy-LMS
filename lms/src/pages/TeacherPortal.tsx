import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Calendar,
  CheckCircle2,
  User,
  CalendarOff,
  Megaphone,
  CalendarCheck,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import {
  type Course,
  type Student,
  type Teacher,
  type Announcement,
  type AnnouncementTarget,
} from "@/types/domain";
import TeacherDashboard from "@/components/teacher/dashboard/TeacherDashboard";
import TeacherClasses from "@/components/teacher/classes/TeacherClasses";
import TeacherProfile from "@/components/teacher/profile/TeacherProfile";
import TeacherLeave from "@/components/teacher/leave/TeacherLeave";
import TeacherAssignments from "@/components/teacher/assignments/TeacherAssignments";
import TeacherNotifications from "@/components/teacher/notifications/TeacherNotifications";
import TeacherAnnouncements from "@/components/teacher/announcements/TeacherAnnouncements";
import TeacherCreateQuiz from "@/components/teacher/quizzes/TeacherCreateQuiz";
import TeacherCheckQuizzes from "@/components/teacher/quizzes/TeacherCheckQuizzes";
import TeacherAttendance from "@/components/teacher/attendance/TeacherAttendance";
import AdminAttendance from "@/components/admin/attendance/AdminAttendance";
import TeacherGradebook from "@/components/teacher/gradebook/TeacherGradebook";
import TeacherTimetable from "@/components/teacher/timetable/TeacherTimetable";
import { apiAuthRequest } from "@/lib/api";
import { EmptyState, SectionLoader } from "@/components/ui/states";
import type { BackendClass, BackendCourse } from "@/hooks/use-teacher-data";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "classes", label: "My Classes", icon: BookOpen },
  { id: "gradebook", label: "Gradebook", icon: ClipboardList },
  { id: "assignments", label: "Assignments", icon: ClipboardList },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "timetable", label: "Timetable", icon: Calendar },
  { id: "see-attendance", label: "See Attendance", icon: CalendarCheck },
  { id: "createQuiz", label: "Create Quiz", icon: ClipboardCheck },
  { id: "checkQuizzes", label: "Check Quizzes", icon: CheckCircle2 },
  { id: "leave", label: "Apply for Leave", icon: CalendarOff },
  { id: "announcements", label: "Announcements", icon: Megaphone },
];

const emptyTeacher: Teacher = {
  id: 0,
  backendId: "",
  name: "Teacher",
  subject: "",
  email: "",
  avatar: "T",
  classes: [],
  students: 0,
  phone: "",
  address: "",
  dob: "",
  gender: "",
  qualification: "",
  joinDate: "",
  emergencyContact: "",
  emergencyPhone: "",
};

type BackendStudent = {
  id: string;
  admissionNo: string;
  name: string;
  email: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  status: string;
};

type BackendTeacher = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  subject: string;
  classes: string[];
  phone: string;
  address: string;
  dob: string;
  status: string;
  emergencyContact: string;
  emergencyPhone: string;
  qualification?: string;
  gender?: string;
  avatarUrl?: string;
  classSubjects?: Record<string, string[]>;
};

type BackendAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  authorName: string;
  publishedAt: string;
};

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

const mapStudent = (student: BackendStudent, index: number): Student => ({
  id: toNumber(student.admissionNo, index + 1),
  backendId: student.id,
  name: student.name,
  email: student.email,
  grade: student.grade,
  avatar: initials(student.name),
  gender: "",
  dob: "",
  phone: "",
  guardian: student.guardian,
  guardianPhone: student.guardianPhone,
  address: "",
  enrollDate: "",
  status: student.status,
  attendance: { present: 0, absent: 0, late: 0, total: 0 },
  tests: [],
  progress: [],
  assignments: [],
  behavior: [],
  fees: { total: 0, paid: 0, pending: 0, status: "Pending" },
});

const mapTeacher = (teacher: BackendTeacher, index: number): Teacher => ({
  id: toNumber(teacher.employeeNo, index + 1),
  backendId: teacher.id,
  name: teacher.name,
  subject: teacher.subject,
  email: teacher.email,
  avatar: initials(teacher.name),
  avatarUrl: teacher.avatarUrl ?? "",
  classes: teacher.classes ?? [],
  students: 0,
  phone: teacher.phone ?? "",
  address: teacher.address ?? "",
  dob: teacher.dob ?? "",
  gender: teacher.gender ?? "",
  qualification: teacher.qualification ?? "",
  joinDate: "",
  emergencyContact: teacher.emergencyContact ?? "",
  emergencyPhone: teacher.emergencyPhone ?? "",
  classSubjects: teacher.classSubjects ?? {},
});

const mapAnnouncement = (
  announcement: BackendAnnouncement,
  index: number,
): Announcement => ({
  id: toNumber(announcement.id, index + 1),
  title: announcement.title,
  date: announcement.publishedAt.slice(0, 10),
  priority: announcement.priority,
  content: announcement.content,
  author: announcement.authorName,
});

const TeacherPortal = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const [selectedClass, setSelectedClass] = useState<Course | null>(null);

  const {
    data: portalData,
    isLoading,
    isError: hasLoadError,
  } = useQuery({
    queryKey: ["teacher-portal-data"],
    queryFn: async () => {
      const [teacherResult, studentsResult, announcementsResult, classesResult, coursesResult] =
        await Promise.allSettled([
          apiAuthRequest<BackendTeacher>("/teachers/me"),
          apiAuthRequest<BackendStudent[]>("/students"),
          apiAuthRequest<BackendAnnouncement[]>("/announcements"),
          apiAuthRequest<BackendClass[]>("/classes"),
          apiAuthRequest<BackendCourse[]>("/courses"),
        ]);

      let teacherData = emptyTeacher;
      if (teacherResult.status === "fulfilled") {
        teacherData = mapTeacher(teacherResult.value, 0);
      }

      let studentsData: Student[] = [];
      if (studentsResult.status === "fulfilled") {
        studentsData = studentsResult.value.map(mapStudent);
      }

      let announcementsData: Announcement[] = [];
      if (announcementsResult.status === "fulfilled") {
        announcementsData = announcementsResult.value.map((a, idx) =>
          mapAnnouncement(a, idx),
        );
      }

      const classesData = classesResult.status === "fulfilled" ? classesResult.value : [];
      const coursesData = coursesResult.status === "fulfilled" ? coursesResult.value : [];

      return {
        teacher: teacherData,
        students: studentsData,
        announcements: announcementsData,
        classes: classesData,
        courses: coursesData,
      };
    },
  });

  const teacher = portalData?.teacher ?? emptyTeacher;
  const students = portalData?.students ?? [];
  const announcements = portalData?.announcements ?? [];
  const allBackendClasses = portalData?.classes ?? [];
  const allBackendCourses = portalData?.courses ?? [];
  const myStudents = students;
  const teacherBackendCourses = useMemo(
    () =>
      teacher.backendId
        ? allBackendCourses.filter((course) => course.teacherId === teacher.backendId)
        : allBackendCourses,
    [allBackendCourses, teacher.backendId],
  );

  const classNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    allBackendClasses.forEach((c) => {
      map[c.id] = c.name;
    });
    return map;
  }, [allBackendClasses]);

  const studentIdMap = useMemo(
    () =>
      Object.fromEntries(
        students
          .filter((student) => !!student.backendId)
          .map((student) => [student.id, student.backendId as string]),
      ),
    [students],
  );

  const allowedSections = useMemo(
    () => new Set([...navItems.map((item) => item.id), "profile"]),
    [],
  );

  const activeNav = allowedSections.has(section ?? "")
    ? (section as string)
    : "dashboard";

  useEffect(() => {
    if (!section || !allowedSections.has(section)) {
      navigate("/teacher/dashboard", { replace: true });
    }
  }, [allowedSections, navigate, section]);

  useEffect(() => {
    if (activeNav !== "classes" && selectedClass) {
      setSelectedClass(null);
    }
  }, [activeNav, selectedClass]);

  const handleNavChange = (nav: string) => {
    navigate(`/teacher/${nav}`);
  };

  const createAnnouncementMutation = useMutation({
    mutationFn: async ({
      announcement,
      target,
    }: {
      announcement: Announcement;
      target: AnnouncementTarget;
    }) => {
      return apiAuthRequest<BackendAnnouncement>("/announcements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: announcement.title,
          content: announcement.content,
          priority: announcement.priority,
          targetType: target.targetType,
          targetClasses: target.targetClasses,
          targetStudentIds: target.targetStudentIds
            .map((id) => studentIdMap[id])
            .filter((id): id is string => Boolean(id)),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-portal-data"] });
    },
  });

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <TeacherDashboard
            teacher={teacher}
            allClasses={allBackendClasses}
            students={myStudents.filter((s) => (teacher.classes ?? []).includes(s.grade))}
            onNavigate={handleNavChange}
            onSelectClass={setSelectedClass}
          />
        );
      case "classes":
        return (
          <TeacherClasses
            teacher={teacher}
            selectedClass={selectedClass}
            onSelectClass={setSelectedClass}
            onNavigate={handleNavChange}
          />
        );
      case "gradebook":
        return (
          <TeacherGradebook
            teacher={teacher}
            allTeacherClasses={allBackendClasses}
            students={myStudents.filter((s) =>
              (teacher.classes ?? []).includes(s.grade),
            )}
          />
        );
      case "timetable":
        return <TeacherTimetable teacher={teacher} allTeacherClasses={allBackendClasses} />;
      case "profile":
        return (
          <TeacherProfile
            teacher={teacher}
            onProfileUpdated={(next) => {
              queryClient.setQueryData(["teacher-portal-data"], (old: any) => {
                if (!old) return old;
                return { ...old, teacher: { ...old.teacher, ...next } };
              });
            }}
          />
        );
      case "leave":
        return <TeacherLeave teacher={teacher} />;
      case "assignments":
        return (
          <TeacherAssignments
            teacher={teacher}
            allTeacherClasses={allBackendClasses}
            students={myStudents.filter((s) =>
              (teacher.classes ?? []).includes(s.grade),
            )}
          />
        );
      case "attendance":
        return (
          <TeacherAttendance
            students={myStudents.filter((s) =>
              (teacher.classes ?? []).includes(s.grade),
            )}
            teacherName={teacher.name}
            teacherClasses={teacher.classes ?? []}
            allTeacherClasses={allBackendClasses}
          />
        );
      case "see-attendance":
        return (
          <AdminAttendance
            students={myStudents.filter((s) => (teacher.classes ?? []).includes(s.grade))}
          />
        );
      case "createQuiz":
        return (
          <TeacherCreateQuiz
            teacher={teacher}
            classNameMap={classNameMap}
            backendCourses={teacherBackendCourses}
          />
        );
      case "checkQuizzes":
        return (
          <TeacherCheckQuizzes
            teacher={teacher}
            students={myStudents.filter((s) => (teacher.classes ?? []).includes(s.grade))}
          />
        );
      case "announcements": {
        const teacherClasses = teacher.classes || [];
        const studentsInTeacherClasses = myStudents.filter((s) =>
          (teacherClasses ?? []).includes(s.grade),
        );
        return (
          <TeacherAnnouncements
            senderName={teacher.name}
            classes={teacherClasses}
            students={studentsInTeacherClasses}
            receivedAnnouncements={announcements}
            allStudentsLabel="All Students (in my classes)"
            onAnnouncementCreated={(announcement, target) =>
              createAnnouncementMutation.mutateAsync({ announcement, target })
            }
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <PortalLayout
      role="Teacher"
      userName={teacher.name}
      userAvatar={teacher.avatar}
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={handleNavChange}
      notificationSlot={
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleNavChange("profile")}
            className="btn-outline btn-icon h-9 w-9 rounded-full bg-primary/10 hover:bg-primary/20"
            title="My Profile"
            aria-label="Open my profile"
          >
            <User className="h-5 w-5 text-primary" />
          </button>
          <TeacherNotifications
            teacher={teacher}
            students={myStudents.filter((student) => (teacher.classes ?? []).includes(student.grade))}
            onNavigate={handleNavChange}
          />
        </div>
      }
    >
      <div className="space-y-6 animate-fade-in">
        {/* Main content container for all tabs (announcements is already inside its own card) */}
        {activeNav !== "announcements" ? (
          <div className="card card-elevated animate-slide-up p-6">
            {isLoading ? (
              <SectionLoader label="Loading teacher workspace..." />
            ) : hasLoadError ? (
              <EmptyState
                title="Unable to load teacher data"
                description="Please refresh the page or try again in a moment."
              />
            ) : (
              renderContent()
            )}
          </div>
        ) : (
          isLoading ? (
            <SectionLoader label="Loading announcements..." />
          ) : hasLoadError ? (
            <EmptyState
              title="Unable to load announcements"
              description="Please refresh the page or try again in a moment."
            />
          ) : (
            renderContent()
          )
        )}
      </div>
    </PortalLayout>
  );
};

export default TeacherPortal;
