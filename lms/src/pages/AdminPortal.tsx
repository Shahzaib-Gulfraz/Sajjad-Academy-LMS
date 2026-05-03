import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  LayoutDashboard,
  UserCog,
  Wallet,
  GraduationCap,
  CalendarCheck,
  CalendarDays,
  Bell,
  Layers3,
  CalendarClock,
  FileText,
  Settings,
} from "lucide-react";
import PortalLayout from "@/components/PortalLayout";
import AdminDashboard from "@/components/admin/dashboard/AdminDashboard";
import AdminAttendance from "@/components/admin/attendance/AdminAttendance";
import AdminLeaveRequests from "@/components/admin/leave-requests/AdminLeaveRequests";
import AdminAnnouncements from "@/components/admin/announcements/AdminAnnouncements";
import AdminReports from "@/components/admin/reports/AdminReports";
import AdminStudent from "@/components/admin/student/AdminStudent";
import FeeManagement from "@/components/admin/fee/FeeManagement";
import AdminTeacher from "@/components/admin/teacher/AdminTeacher";
import AdminTimetablePlanner from "@/components/admin/planner/AdminTimetablePlanner";
import AdminCreateClass from "@/components/admin/create-class/AdminCreateClass";
import AdminSettings from "@/components/admin/settings/AdminSettings";
import AdminPasswordResetNotifications from "@/components/admin/communication/AdminPasswordResetNotifications";
import { useAdminData } from "@/hooks/use-admin-data";

const DEFAULT_SUBJECTS = [
  "Mathematics",
  "English",
  "Physics",
  "Chemistry",
  "Urdu",
  "Computer Science",
  "Biology",
];

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "create-class", label: "Create Class", icon: Layers3 },
  { id: "students", label: "Students", icon: UserCog },
  { id: "teachers", label: "Teachers", icon: GraduationCap },
  { id: "fee", label: "Fee Management", icon: Wallet },
  { id: "planner", label: "Timetable Planner", icon: CalendarClock },
  { id: "attendance", label: "Attendance", icon: CalendarCheck },
  { id: "leave-requests", label: "Leave Requests", icon: CalendarDays },
  { id: "announcements", label: "Announcements", icon: Bell },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const AdminPortal = () => {
  const navigate = useNavigate();
  const { section } = useParams<{ section?: string }>();
  const {
    announcements,
    setAnnouncements,
    students,
    setStudents,
    teachers,
    setTeachers,
    feeTransactions,
    setFeeTransactions,
    plannerAllocations,
    setPlannerAllocations,
    customClasses,
    setCustomClasses,
    classSubjects,
    setClassSubjects,
    backendClasses,
    addAuditLog,
    createFeeTransaction,
    updateFeeTransaction,
    assignStudentFeeDue,
    createStudent,
    updateStudent,
    deleteStudent,
    resetStudentPassword,
    createTeacher,
    updateTeacher,
    deleteTeacher,
    resetTeacherPassword,
    createClass,
    deleteClass,
    addClassSubject,
    deleteClassSubject,
    updateClassSubject,
    fetchPlannerAllocations,
    fetchAllPlannerAllocations,
    createPlannerAllocation,
    updatePlannerAllocation,
    deletePlannerAllocation,
  } = useAdminData();

  const [feeFilter, setFeeFilter] = useState<"all" | "pending">("all");
  const [studentSection, setStudentSection] = useState<"enroll" | "search" | "reset">(
    "enroll"
  );
  const [dashboardSelectedStudentId, setDashboardSelectedStudentId] = useState<
    number | null
  >(null);
  const [teacherSection, setTeacherSection] = useState<"enroll" | "search" | "reset">(
    "enroll"
  );
  const [pendingLeaves, setPendingLeaves] = useState(3);
  const currentAdmin = "Admin User";

  const activeNav = navItems.some((item) => item.id === section)
    ? (section as string)
    : "dashboard";

  useEffect(() => {
    if (!section || !navItems.some((item) => item.id === section)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate, section]);

  const handleNavChange = (id: string) => {
    if (id === "fee") {
      setFeeFilter("all");
    }
    navigate(`/admin/${id}`);
  };

  const navigateTo = (id: string) => {
    navigate(`/admin/${id}`);
  };

  const classOptions = useMemo(() => {
    const fromStudents = students.map((s) => s.grade);
    const fromAllocations = plannerAllocations.map((a) => a.className);
    return Array.from(new Set([...fromStudents, ...fromAllocations, ...customClasses])).sort();
  }, [students, plannerAllocations, customClasses]);

  const subjectOptions = useMemo(() => {
    const fromTeachers = teachers.flatMap((t) =>
      t.subject
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    );
    const fromAllocations = plannerAllocations.map((a) => a.subject);
    const fromClasses = Object.values(classSubjects)
      .flat()
      .map((s) => s.name);
    return Array.from(
      new Set([...DEFAULT_SUBJECTS, ...fromTeachers, ...fromAllocations, ...fromClasses])
    ).sort();
  }, [teachers, plannerAllocations, classSubjects]);

  const transformedClassSubjects = useMemo(() => {
    return Object.fromEntries(
      Object.entries(classSubjects).map(([cls, subs]) => [
        cls,
        subs.map((s) => s.name),
      ])
    );
  }, [classSubjects]);

  const timetableRows = useMemo(() => {
    const dayMap: Record<string, "mon" | "tue" | "wed" | "thu" | "fri"> = {
      Mon: "mon",
      Tue: "tue",
      Wed: "wed",
      Thu: "thu",
      Fri: "fri",
    };

    const rows = plannerAllocations.reduce<
      Record<
        string,
        {
          time: string;
          mon?: string;
          tue?: string;
          wed?: string;
          thu?: string;
          fri?: string;
        }
      >
    >((acc, allocation) => {
      const key = allocation.time || `${allocation.startTime} - ${allocation.endTime}`;
      const dayKey = dayMap[allocation.day];
      if (!dayKey) return acc;

      if (!acc[key]) {
        acc[key] = { time: key };
      }

      acc[key][dayKey] = allocation.subject;
      return acc;
    }, {});

    return Object.values(rows);
  }, [plannerAllocations]);

  const courseSummaries = useMemo(() => {
    const scheduleByClassSubject = plannerAllocations.reduce<Record<string, string>>((acc, item) => {
      const key = `${item.className}::${item.subject}`;
      const label = `${item.day} ${item.time}`;
      acc[key] = acc[key] ? `${acc[key]}, ${label}` : label;
      return acc;
    }, {});

    return Object.entries(classSubjects).flatMap(([className, subjects], index) =>
      subjects.map((subject, subjectIndex) => ({
        id: index * 100 + subjectIndex + 1,
        name: subject,
        code: `${className}-${subject}`.replace(/\s+/g, "-").toUpperCase(),
        progress: 0,
        schedule: scheduleByClassSubject[`${className}::${subject}`] ?? "Not set",
      })),
    );
  }, [classSubjects, plannerAllocations]);

  const renderContent = () => {
    switch (activeNav) {
      case "dashboard":
        return (
          <AdminDashboard
            students={students}
            teachersCount={teachers.length}
            announcements={announcements}
            pendingLeaves={pendingLeaves}
            onOpenStudent={(student) => {
              if (student) {
                setStudentSection("search");
                setDashboardSelectedStudentId(student.id);
                handleNavChange("students");
              }
            }}
            onOpenStudentSearch={() => {
              setStudentSection("search");
              setDashboardSelectedStudentId(null);
              handleNavChange("students");
            }}
            onOpenTeacherSearch={() => {
              setTeacherSection("search");
              handleNavChange("teachers");
            }}
            onOpenAnnouncements={() => handleNavChange("announcements")}
            onOpenLeaveRequests={() => handleNavChange("leave-requests")}
            onOpenFeeWithDues={() => {
              setFeeFilter("pending");
              navigateTo("fee");
            }}
          />
        );
      case "students":
        return (
          <AdminStudent
            students={students}
            onStudentsChange={setStudents}
            onOpenFeeManagement={() => handleNavChange("fee")}
            timetable={timetableRows}
            onAuditLog={addAuditLog}
            currentAdmin={currentAdmin}
            initialSection={studentSection}
            initialSelectedStudentId={dashboardSelectedStudentId}
            onCreateStudent={createStudent}
            onUpdateStudent={updateStudent}
            onDeleteStudent={deleteStudent}
            onResetStudentPassword={resetStudentPassword}
          />
        );
      case "fee":
        return (
          <FeeManagement
            students={students}
            onStudentsChange={setStudents}
            onRecordTransaction={createFeeTransaction}
            onUpdateTransaction={updateFeeTransaction}
            onAssignDue={assignStudentFeeDue}
            onTransactionsChange={setFeeTransactions}
            transactions={feeTransactions}
            onAuditLog={addAuditLog}
            currentAdmin={currentAdmin}
            showPendingOnly={feeFilter === "pending"}
          />
        );
      case "teachers":
        return (
          <AdminTeacher
            teachers={teachers}
            onTeachersChange={setTeachers}
            onAuditLog={addAuditLog}
            currentAdmin={currentAdmin}
            initialSection={teacherSection}
            onCreateTeacher={createTeacher}
            onUpdateTeacher={updateTeacher}
            onDeleteTeacher={deleteTeacher}
            onResetTeacherPassword={resetTeacherPassword}
            classOptions={customClasses}
            subjectOptions={subjectOptions}
            classSubjectOptions={transformedClassSubjects}
          />
        );
      case "planner":
        return (
          <AdminTimetablePlanner
            teachers={teachers}
            allocations={plannerAllocations}
            classOptions={customClasses}
            subjectOptions={subjectOptions}
            onAllocationsChange={setPlannerAllocations}
            classSubjectOptions={transformedClassSubjects}
            onLoadWeek={fetchPlannerAllocations}
            onLoadAll={fetchAllPlannerAllocations}
            onCreateAllocation={createPlannerAllocation}
            onUpdateAllocation={updatePlannerAllocation}
            onDeleteAllocation={deletePlannerAllocation}
          />
        );
      case "create-class":
        return (
          <AdminCreateClass
            classes={customClasses}
            classSubjects={classSubjects}
            teachers={teachers}
            students={students}
            onAddClass={createClass}
            onDeleteClass={deleteClass}
            onAddSubject={addClassSubject}
            onDeleteSubject={deleteClassSubject}
            onUpdateSubject={updateClassSubject}
          />
        );
      case "attendance":
        return <AdminAttendance students={students} allTeacherClasses={backendClasses} />;
      case "leave-requests":
        return <AdminLeaveRequests onPendingCountChange={setPendingLeaves} />;
      case "announcements":
        return (
          <AdminAnnouncements
            announcements={announcements}
            students={students}
            onAnnouncementsChange={setAnnouncements}
          />
        );
      case "reports":
        return <AdminReports />;
      case "settings":
        return <AdminSettings />;
      default:
        return null;
    }
  };

  return (
    <PortalLayout
      role="Administrator"
      userName="Admin User"
      userAvatar="AU"
      navItems={navItems}
      activeNav={activeNav}
      onNavChange={(id) => {
        handleNavChange(id);
      }}
      notificationSlot={<AdminPasswordResetNotifications />}
    >

      {/* Main content area with consistent card styling */}
      <div className="card card-elevated animate-fade-in p-6">
        {renderContent()}
      </div>
    </PortalLayout>
  );
};

export default AdminPortal;
