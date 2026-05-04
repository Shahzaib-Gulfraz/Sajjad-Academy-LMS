import { useEffect, useMemo, useState } from "react";
import { usePersistentState } from "@/hooks/use-persistent-state";
import type { Announcement, Student, Teacher } from "@/types/domain";
import type { AdminTeacherRecord } from "@/components/admin/teacher/types";
import type {
  AuditLogEntry,
  FeeTransaction,
  PlannerAllocation,
} from "@/components/admin/types";
import { ApiRequestError, apiAuthRequest } from "@/lib/api";

type BackendStudent = {
  id: string;
  admissionNo: string;
  name: string;
  email: string;
  grade: string;
  guardian: string;
  guardianPhone: string;
  gender?: string;
  dob?: string;
  phone?: string;
  address?: string;
  subjects?: string[];
  status: string;
};

type BackendTeacher = {
  id: string;
  employeeNo: string;
  name: string;
  email: string;
  subject: string;
  gender?: string;
  qualification?: string;
  phone?: string;
  address?: string;
  dob?: string;
  classes: string[];
  classSubjects?: Record<string, string[]>;
  status: string;
  emergencyContact?: string;
  emergencyPhone?: string;
};

type BackendAnnouncement = {
  id: string;
  title: string;
  content: string;
  priority: "low" | "medium" | "high";
  authorName: string;
  authorRole?: string;
  hidden?: boolean;
  publishedAt: string;
};

type BackendFeeTransaction = {
  id: string;
  studentId: string;
  receiptNo: string;
  amount: number;
  method: FeeTransaction["method"];
  collector: string;
  remarks?: string;
  paidAt: string;
};

type BackendFeeDuesItem = {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  pending: number;
};

type BackendFeeStudentSummary = {
  studentId: string;
  totalDue: number;
  totalPaid: number;
  pending: number;
  status: "Paid" | "Partial" | "Pending";
};

type BackendClass = {
  id: string;
  name: string;
  academicYear: string;
  subjects: { id: string; name: string }[];
};

type BackendTimetableSlot = {
  id: string;
  startDate: string;
  endDate: string;
  date: string;
  startTime: string;
  endTime: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

const toPlannerDay = (dateValue: string): PlannerAllocation["day"] => {
  const date = new Date(`${dateValue}T00:00:00`);
  const label = DAYS[date.getDay()];
  if (label === "Mon" || label === "Tue" || label === "Wed" || label === "Thu" || label === "Fri") {
    return label;
  }
  return "Mon";
};

const formatTimeRange = (start?: string, end?: string) => {
  if (!start || !end) return "";
  return `${start} - ${end}`;
};

const getWeekRange = (baseDate = new Date()) => {
  const date = new Date(baseDate);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() + diffToMonday);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4);

  const toISODate = (d: Date) => d.toISOString().slice(0, 10);
  return {
    weekStart: toISODate(weekStart),
    weekEnd: toISODate(weekEnd),
  };
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

const mapAnnouncement = (announcement: BackendAnnouncement, index: number): Announcement => ({
  id: toNumber(announcement.id, index + 1),
  backendId: announcement.id,
  title: announcement.title,
  date: announcement.publishedAt.slice(0, 10),
  priority: announcement.priority,
  content: announcement.content,
  author: announcement.authorName,
  authorRole: announcement.authorRole,
  hidden: announcement.hidden ?? false,
});

const feeStatusFromSummary = (summary: {
  totalDue: number;
  totalPaid: number;
  pending: number;
}): "Paid" | "Partial" | "Pending" => {
  if (summary.pending <= 0 && summary.totalDue > 0) return "Paid";
  if (summary.totalPaid > 0) return "Partial";
  return "Pending";
};

export const useAdminData = () => {
  const [studentIdMap, setStudentIdMap] = useState<Record<number, string>>({});
  const [teacherIdMap, setTeacherIdMap] = useState<Record<number, string>>({});
  const [classIdMap, setClassIdMap] = useState<Record<string, string>>({});
  const [classNameMap, setClassNameMap] = useState<Record<string, string>>({});
  const [backendClasses, setBackendClasses] = useState<{ id: string; name: string }[]>([]);

  const [announcements, setAnnouncements] = usePersistentState<Announcement[]>({
    key: "announcements",
    defaultValue: [],
  });
  const [students, setStudents] = usePersistentState<Student[]>({
    key: "students",
    defaultValue: [],
  });
  const [teachers, setTeachers] = usePersistentState<AdminTeacherRecord[]>({
    key: "teachers",
    defaultValue: [],
  });
  const [feeTransactions, setFeeTransactions] = usePersistentState<FeeTransaction[]>({
    key: "fee-transactions",
    defaultValue: [],
  });
  const [auditLogs, setAuditLogs] = usePersistentState<AuditLogEntry[]>({
    key: "audit-logs",
    defaultValue: [],
  });
  const [plannerAllocations, setPlannerAllocations] = usePersistentState<PlannerAllocation[]>({
    key: "planner-allocations",
    defaultValue: [],
  });
  const [customClasses, setCustomClasses] = usePersistentState<string[]>({
    key: "custom-classes",
    defaultValue: [],
  });
  const [classSubjects, setClassSubjects] = usePersistentState<
    Record<string, { id: string; name: string }[]>
  >({
    key: "class-subjects",
    defaultValue: {},
  });

  const teacherBackendByName = useMemo(
    () =>
      Object.fromEntries(
        teachers
          .map((teacher) => {
            const backendId = teacherIdMap[teacher.id];
            if (!backendId) return null;
            return [teacher.name.trim().toLowerCase(), backendId] as const;
          })
          .filter((entry): entry is readonly [string, string] => Boolean(entry)),
      ),
    [teacherIdMap, teachers],
  );

  const applyClassesSnapshot = (classRows: BackendClass[]) => {
    const nextClassIdMap: Record<string, string> = {};
    const nextClassNameMap: Record<string, string> = {};
    const nextClassSubjects: Record<string, { id: string; name: string }[]> = {};
    
    const nextCustomClasses = classRows
      .map((item) => {
        nextClassIdMap[item.name] = item.id;
        nextClassNameMap[item.id] = item.name;
        nextClassSubjects[item.name] = item.subjects ?? [];
        return item.name;
      })
      .filter(Boolean)
      .sort();

    setClassIdMap(nextClassIdMap);
    setClassNameMap(nextClassNameMap);
    setCustomClasses(nextCustomClasses);
    setClassSubjects(nextClassSubjects);
    
    // Build class array with IDs for UI consumption
    const classesWithIds = classRows.map(c => ({ id: c.id, name: c.name }));
    setBackendClasses(classesWithIds);

    return { nextClassIdMap, nextClassNameMap, nextClassSubjects };
  };

  const refreshClassesFromServer = async () => {
    const classRows = await apiAuthRequest<BackendClass[]>("/classes");
    applyClassesSnapshot(classRows);
  };

  const mapBackendSlotToPlanner = (
    slot: BackendTimetableSlot,
    backendTeacherToNumeric: Record<string, number>,
  ): PlannerAllocation => {
    const className = classNameMap[slot.className] || slot.className;
    const availableSubjects = classSubjects[className] || [];
    const subjectName = availableSubjects.find(s => s.id === slot.subject)?.name || slot.subject;
    
    const teacherNumericId = backendTeacherToNumeric[slot.teacherId] ?? 0;
    const teacher = teachers.find(t => t.id === teacherNumericId);

    return {
      id: slot.id,
      startDate: slot.startDate,
      endDate: slot.endDate,
      day: toPlannerDay(slot.date),
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      time: formatTimeRange(slot.startTime, slot.endTime),
      className,
      subject: subjectName,
      teacherId: teacherNumericId,
      teacherName: teacher?.name ?? "Unknown Teacher",
    };
  };

  useEffect(() => {
    let mounted = true;

    const loadAdminData = async () => {
      try {
        const [studentRes, teacherRes, announcementRes, transactionRes, classRes, duesRes] = await Promise.all([
          apiAuthRequest<BackendStudent[]>("/students"),
          apiAuthRequest<BackendTeacher[]>("/teachers"),
          apiAuthRequest<BackendAnnouncement[]>("/announcements"),
          apiAuthRequest<BackendFeeTransaction[]>("/fees/transactions"),
          apiAuthRequest<BackendClass[]>('/classes'),
          apiAuthRequest<BackendFeeDuesItem[]>('/fees/reports/dues'),
        ]);

        if (!mounted) return;

        const { nextClassNameMap, nextClassSubjects } = applyClassesSnapshot(classRes);

        const duesByStudentId = new Map<string, BackendFeeDuesItem>(
          duesRes.map((item) => [item.studentId, item]),
        );

        const nextStudents = studentRes.map((student, index) => {
          const id = toNumber(student.admissionNo, index + 1);
          
          // Map class ID back to name
          const gradeName = nextClassNameMap[student.grade] || student.grade;
            
          // Map subject IDs back to names
          const availableSubjects = nextClassSubjects[gradeName] || [];
          const subjects = (student.subjects || [])
            .map(sid => availableSubjects.find(s => s.id === sid)?.name || sid)
            .filter(Boolean);

          const mapped: Student = {
            id,
            backendId: student.id,
            admissionNo: student.admissionNo,
            name: student.name,
            email: student.email,
            grade: gradeName,
            avatar: initials(student.name),
            gender: student.gender ?? "",
            dob: student.dob ?? "",
            phone: student.phone ?? "",
            guardian: student.guardian,
            guardianPhone: student.guardianPhone,
            address: student.address ?? "",
            enrollDate: "",
            status: student.status,
            attendance: { present: 0, absent: 0, late: 0, total: 0 },
            tests: subjects.map((subject) => ({
              subject,
              test: 'Enrollment Subject',
              marks: 0,
              total: 100,
              date: new Date().toISOString().slice(0, 10),
              grade: 'N/A',
            })),
            progress: [],
            assignments: [],
            behavior: [],
            fees: { total: 0, paid: 0, pending: 0, status: "Pending" },
          };

          const summary = duesByStudentId.get(student.id);
          if (!summary) return mapped;

          return {
            ...mapped,
            fees: {
              total: summary.totalDue,
              paid: summary.totalPaid,
              pending: summary.pending,
              status: feeStatusFromSummary(summary),
            },
          };
        });
        const studentByBackendKey = new Map<string, Student>();
        const nextStudentMap: Record<number, string> = {};
        const nextTeacherMap: Record<number, string> = {};

        studentRes.forEach((student, index) => {
          const mapped = nextStudents[index];
          studentByBackendKey.set(student.id, mapped);
          studentByBackendKey.set(student.admissionNo, mapped);
          nextStudentMap[mapped.id] = student.id;
        });

        setStudents(nextStudents);
        setStudentIdMap(nextStudentMap);

        const nextTeachers = teacherRes.map((bt, index) => {
          const id = toNumber(bt.employeeNo, index + 1);
          
          // Map class IDs back to names
          const classNames = (bt.classes || [])
            .map(cid => nextClassNameMap[cid])
            .filter(Boolean);
            
          // Map classSubject IDs back to names
          const mappedClassSubjects: Record<string, string[]> = {};
          Object.entries(bt.classSubjects ?? {}).forEach(([classId, subjectIds]) => {
            const className = nextClassNameMap[classId];
            if (className) {
              const availableSubjects = nextClassSubjects[className] || [];
              mappedClassSubjects[className] = (subjectIds || [])
                .map(sid => availableSubjects.find(s => s.id === sid)?.name)
                .filter((name): name is string => Boolean(name));
            }
          });

          return {
            id,
            backendId: bt.id,
            employeeNo: bt.employeeNo,
            name: bt.name,
            subject: bt.subject,
            email: bt.email,
            avatar: initials(bt.name),
            classes: classNames,
            students: 0,
            phone: bt.phone ?? "",
            address: bt.address ?? "",
            dob: bt.dob ?? "",
            gender: bt.gender ?? "",
            qualification: bt.qualification ?? "",
            joinDate: "",
            emergencyContact: bt.emergencyContact ?? "",
            emergencyPhone: bt.emergencyPhone ?? "",
            status: bt.status,
            classSubjects: mappedClassSubjects,
          } as AdminTeacherRecord;
        });

        teacherRes.forEach((teacher, index) => {
          nextTeacherMap[nextTeachers[index].id] = teacher.id;
        });
        setTeacherIdMap(nextTeacherMap);
        setTeachers(nextTeachers);
        setAnnouncements(announcementRes.map(mapAnnouncement));
        setFeeTransactions(
          transactionRes.map((tx) => {
            const student = studentByBackendKey.get(tx.studentId);
            const numericId = student?.id ?? 0;
            return {
              id: tx.id,
              receiptNo: tx.receiptNo,
              studentId: numericId,
              studentName: student?.name ?? `Student ${tx.studentId}`,
              className: student?.grade ?? "",
              amount: tx.amount,
              method: tx.method,
              collector: tx.collector,
              remarks: tx.remarks ?? "",
              transactionDate: tx.paidAt,
            } as FeeTransaction;
          }),
        );
      } catch {
        // Keep existing local fallback state when API calls fail.
      }
    };

    void loadAdminData();

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAnnouncements, setFeeTransactions, setStudents, setTeachers]);

  const fetchPlannerAllocations = async (args: {
    weekStart: string;
    weekEnd: string;
  }) => {
    const rows = await apiAuthRequest<BackendTimetableSlot[]>(
      `/timetable/slots?weekStart=${args.weekStart}&weekEnd=${args.weekEnd}`,
    );
    const backendTeacherToNumeric = Object.fromEntries(
      Object.entries(teacherIdMap).map(([numericId, backendId]) => [backendId, Number(numericId)]),
    );
    const mapped = rows.map((slot) =>
      mapBackendSlotToPlanner(slot, backendTeacherToNumeric),
    );
    setPlannerAllocations(mapped);
    return mapped;
  };

  const fetchAllPlannerAllocations = async () => {
    const rows = await apiAuthRequest<BackendTimetableSlot[]>(`/timetable/slots`);
    const backendTeacherToNumeric = Object.fromEntries(
      Object.entries(teacherIdMap).map(([numericId, backendId]) => [backendId, Number(numericId)]),
    );
    const mapped = rows.map((slot) => mapBackendSlotToPlanner(slot, backendTeacherToNumeric));
    setPlannerAllocations(mapped);
    return mapped;
  };

  const createPlannerAllocation = async (slot: {
    startDate: string;
    endDate: string;
    date: string;
    startTime: string;
    endTime: string;
    className: string;
    subject: string;
    teacherId: number;
  }) => {
    const selectedTeacher = teachers.find((teacher) => teacher.id === slot.teacherId);
    const backendTeacherId =
      teacherIdMap[slot.teacherId] ??
      (selectedTeacher ? teacherBackendByName[selectedTeacher.name.trim().toLowerCase()] : undefined);
    if (!backendTeacherId) {
      throw new Error('Selected teacher is not synced with backend. Refresh and try again.');
    }

    const classId = classIdMap[slot.className];
    const availableSubjects = classSubjects[slot.className] || [];
    const subjectId = availableSubjects.find(s => s.name === slot.subject)?.id || slot.subject;

    if (!classId) {
        throw new Error(`Class "${slot.className}" not found in synced data.`);
    }

    let created: BackendTimetableSlot;
    try {
      created = await apiAuthRequest<BackendTimetableSlot>('/timetable/slots', {
        method: 'POST',
        body: JSON.stringify({
          startDate: slot.startDate,
          endDate: slot.endDate,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          className: classId,
          subject: subjectId,
          teacherId: backendTeacherId,
        }),
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw new Error('Timetable endpoint not found (404). Restart backend with latest code.');
      }
      throw error;
    }

    const mapped = mapBackendSlotToPlanner(created, { [backendTeacherId]: slot.teacherId });
    setPlannerAllocations((prev) => [mapped, ...prev]);
    return mapped;
  };

  const updatePlannerAllocation = async (
    allocationId: string,
    slot: {
      startDate: string;
      endDate: string;
      date: string;
      startTime: string;
      endTime: string;
      className: string;
      subject: string;
      teacherId: number;
    },
  ) => {
    const selectedTeacher = teachers.find((teacher) => teacher.id === slot.teacherId);
    const backendTeacherId =
      teacherIdMap[slot.teacherId] ??
      (selectedTeacher ? teacherBackendByName[selectedTeacher.name.trim().toLowerCase()] : undefined);
    if (!backendTeacherId) {
      throw new Error('Selected teacher is not synced with backend. Refresh and try again.');
    }

    const classId = classIdMap[slot.className];
    const availableSubjects = classSubjects[slot.className] || [];
    const subjectId = availableSubjects.find(s => s.name === slot.subject)?.id || slot.subject;

    if (!classId) {
        throw new Error(`Class "${slot.className}" not found in synced data.`);
    }

    const updated = await apiAuthRequest<BackendTimetableSlot>(`/timetable/slots/${allocationId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        startDate: slot.startDate,
        endDate: slot.endDate,
        date: slot.date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        className: classId,
        subject: subjectId,
        teacherId: backendTeacherId,
      }),
    });

    const mapped = mapBackendSlotToPlanner(updated, { [backendTeacherId]: slot.teacherId });
    setPlannerAllocations((prev) =>
      prev.map((item) => (item.id === allocationId ? mapped : item)),
    );
    return mapped;
  };

  const deletePlannerAllocation = async (allocationId: string) => {
    await apiAuthRequest<{ id: string }>(`/timetable/slots/${allocationId}`, {
      method: 'DELETE',
    });

    setPlannerAllocations((prev) => prev.filter((item) => item.id !== allocationId));
  };

  const createAnnouncement = async (payload: {
    title: string;
    content: string;
    priority?: "low" | "medium" | "high";
  }) => {
    const created = await apiAuthRequest<BackendAnnouncement>("/announcements", {
      method: "POST",
      body: JSON.stringify({
        title: payload.title,
        content: payload.content,
        priority: payload.priority ?? "medium",
        targetType: "all",
      }),
    });

    const mapped = mapAnnouncement(created, Date.now());
    setAnnouncements((prev) => [mapped, ...prev]);
    return mapped;
  };

  const deleteAnnouncement = async (announcementId: number | string) => {
    // backend expects string id
    await apiAuthRequest<{ id: string }>(`/announcements/${announcementId}`, {
      method: 'DELETE',
    });

    setAnnouncements((prev) => prev.filter((a) => String(a.id) !== String(announcementId)));
  };

  const toggleHideAnnouncement = async (announcementId: number | string, hidden: boolean) => {
    // No backend hide endpoint currently — persist locally so hidden items can be shown in a separate tab.
    setAnnouncements((prev) =>
      prev.map((a) =>
        String(a.id) === String(announcementId) ? { ...a, hidden } : a,
      ),
    );
  };

  const createFeeTransaction = async (transaction: FeeTransaction) => {
    const backendStudentId = studentIdMap[transaction.studentId];
    if (!backendStudentId) {
      return;
    }

    const created = await apiAuthRequest<BackendFeeTransaction>("/fees/transactions", {
      method: "POST",
      body: JSON.stringify({
        studentId: backendStudentId,
        amount: transaction.amount,
        method: transaction.method,
        collector: transaction.collector,
        remarks: transaction.remarks,
      }),
    });

    setFeeTransactions((prev) => {
      const exists = prev.some((item) => item.id === created.id);
      if (exists) return prev;

      return [
        {
          id: created.id,
          receiptNo: created.receiptNo,
          studentId: transaction.studentId,
          studentName: transaction.studentName,
          className: transaction.className,
          amount: created.amount,
          method: created.method,
          collector: created.collector,
          remarks: created.remarks ?? "",
          transactionDate: created.paidAt,
        },
        ...prev,
      ];
    });

    const summary = await apiAuthRequest<BackendFeeStudentSummary>(
      `/fees/students/${backendStudentId}/summary`,
    );

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== transaction.studentId) return student;
        return {
          ...student,
          fees: {
            total: summary.totalDue,
            paid: summary.totalPaid,
            pending: summary.pending,
            status: summary.status,
          },
        };
      }),
    );
  };

  const updateFeeTransaction = async (
    txId: string,
    updates: {
      amount: number;
      method: FeeTransaction['method'];
      collector: string;
      remarks: string;
    },
  ) => {
    const existing = feeTransactions.find((tx) => tx.id === txId);
    if (!existing) return;

    const backendStudentId = studentIdMap[existing.studentId];
    if (!backendStudentId) return;

    const updated = await apiAuthRequest<BackendFeeTransaction>(`/fees/transactions/${txId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });

    setFeeTransactions((prev) =>
      prev.map((tx) =>
        tx.id === txId
          ? {
              ...tx,
              amount: updated.amount,
              method: updated.method,
              collector: updated.collector,
              remarks: updated.remarks ?? '',
              transactionDate: updated.paidAt,
            }
          : tx,
      ),
    );

    const summary = await apiAuthRequest<BackendFeeStudentSummary>(
      `/fees/students/${backendStudentId}/summary`,
    );

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== existing.studentId) return student;
        return {
          ...student,
          fees: {
            total: summary.totalDue,
            paid: summary.totalPaid,
            pending: summary.pending,
            status: summary.status,
          },
        };
      }),
    );
  };

  const assignStudentFeeDue = async (args: {
    studentId: number;
    period: string;
    amountDue: number;
  }) => {
    const backendStudentId = studentIdMap[args.studentId];
    if (!backendStudentId) {
      throw new Error('Student is not synced with backend yet. Re-open the page and try again.');
    }

    try {
      await apiAuthRequest<{
        id: string;
        studentId: string;
        period: string;
        amountDue: number;
        status: 'Paid' | 'Partial' | 'Pending';
      }>('/fees/invoices/upsert', {
        method: 'POST',
        body: JSON.stringify({
          studentId: backendStudentId,
          period: args.period,
          amountDue: args.amountDue,
        }),
      });
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 404) {
        throw new Error('Fee invoice endpoint not found (404). Restart backend so latest routes are loaded.');
      }
      throw error;
    }

    const summary = await apiAuthRequest<BackendFeeStudentSummary>(
      `/fees/students/${backendStudentId}/summary`,
    );

    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== args.studentId) return student;
        return {
          ...student,
          fees: {
            total: summary.totalDue,
            paid: summary.totalPaid,
            pending: summary.pending,
            status: summary.status,
          },
        };
      }),
    );
  };

  const createStudent = async (student: Student) => {
    const classId = classIdMap[student.grade];
    const availableSubjects = classSubjects[student.grade] || [];
    const selectedSubjectIds = Array.from(
      new Set(student.tests.map((item) => {
        return availableSubjects.find(s => s.name === item.subject)?.id || item.subject;
      }).filter(Boolean)),
    );

    const admissionNo = (student.admissionNo ?? String(student.id)).trim();
    const email = student.email.trim().toLowerCase();

    const availability = await apiAuthRequest<{
      admissionNoExists: boolean;
      emailExists: boolean;
    }>(
      `/students/availability?admissionNo=${encodeURIComponent(admissionNo)}&email=${encodeURIComponent(email)}`,
    );

    if (availability.admissionNoExists) {
      throw new ApiRequestError(
        `Admission number ${admissionNo} is already assigned to another student.`,
        409,
      );
    }

    if (availability.emailExists) {
      throw new ApiRequestError(
        `Email ${email} is already assigned to another user.`,
        409,
      );
    }

    const created = await apiAuthRequest<BackendStudent>("/students", {
      method: "POST",
      body: JSON.stringify({
        admissionNo,
        name: student.name,
        email,
        grade: classId || student.grade,
        guardian: student.guardian,
        guardianPhone: student.guardianPhone,
        subjects: selectedSubjectIds,
        enrolledCourses: selectedSubjectIds,
      }),
    });

    // Local update with names remains as is for immediate UI feedback
    setStudents((prev) => [...prev, student]);
    setStudentIdMap((prev) => ({ ...prev, [student.id]: created.id }));
    return student;
  };

  const updateStudent = async (student: Student) => {
    const backendStudentId = studentIdMap[student.id];
    if (!backendStudentId) {
      setStudents((prev) => prev.map((item) => (item.id === student.id ? student : item)));
      return student;
    }

    const classId = classIdMap[student.grade];
    const availableSubjects = classSubjects[student.grade] || [];
    const selectedSubjectIds = Array.from(
      new Set(student.tests.map((item) => {
        return availableSubjects.find(s => s.name === item.subject)?.id || item.subject;
      }).filter(Boolean)),
    );

    await apiAuthRequest<BackendStudent>(`/students/${backendStudentId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: student.name,
        email: student.email,
        grade: classId || student.grade,
        guardian: student.guardian,
        guardianPhone: student.guardianPhone,
        subjects: selectedSubjectIds,
        enrolledCourses: selectedSubjectIds,
        status: student.status,
      }),
    });

    setStudents((prev) => prev.map((item) => (item.id === student.id ? student : item)));
    return student;
  };

  const deleteStudent = async (studentId: number) => {
    const backendStudentId = studentIdMap[studentId];
    if (backendStudentId) {
      await apiAuthRequest<{ id: string }>(`/students/${backendStudentId}`, {
        method: "DELETE",
      });
    }

    setStudents((prev) => prev.filter((student) => student.id !== studentId));
    setStudentIdMap((prev) => {
      const next = { ...prev };
      delete next[studentId];
      return next;
    });
  };

  const resetStudentPassword = async (studentId: number) => {
    const backendStudentId = studentIdMap[studentId];
    if (!backendStudentId) {
      return String(studentId);
    }

    const result = await apiAuthRequest<{ id: string; defaultPassword: string }>(
      `/students/${backendStudentId}/reset-password`,
      {
        method: "POST",
      },
    );

    return result.defaultPassword;
  };

  const createTeacher = async (teacher: AdminTeacherRecord) => {
    // Map class names to IDs and subject names to IDs
    const classIds = teacher.classes.map((name) => classIdMap[name]).filter(Boolean);
    const mappedClassSubjects: Record<string, string[]> = {};

    Object.entries(teacher.classSubjects ?? {}).forEach(([className, subjects]) => {
      const classId = classIdMap[className];
      if (classId) {
        const availableSubjects = classSubjects[className] ?? [];
        mappedClassSubjects[classId] = subjects
          .map((subName) => availableSubjects.find((s) => s.name === subName)?.id)
          .filter((id): id is string => Boolean(id));
      }
    });

    const employeeNo = (teacher.employeeNo ?? String(teacher.id)).trim();
    const email = teacher.email.trim().toLowerCase();

    const availability = await apiAuthRequest<{
      employeeNoExists: boolean;
      emailExists: boolean;
    }>(
      `/teachers/availability?employeeNo=${encodeURIComponent(employeeNo)}&email=${encodeURIComponent(email)}`,
    );

    if (availability.employeeNoExists) {
      throw new ApiRequestError(
        `Employee number ${employeeNo} is already assigned to another teacher.`,
        409,
      );
    }

    if (availability.emailExists) {
      throw new ApiRequestError(
        `Email ${email} is already assigned to another user.`,
        409,
      );
    }

    const created = await apiAuthRequest<BackendTeacher>("/teachers", {
      method: "POST",
      body: JSON.stringify({
        employeeNo,
        name: teacher.name,
        email,
        subject: teacher.subject,
        gender: teacher.gender,
        qualification: teacher.qualification,
        classes: classIds,
        classSubjects: mappedClassSubjects,
      }),
    });

    // We don't need to map back here because we refresh from server usually, 
    // but for immediate UI update we use the provided teacher record
    setTeachers((prev) => [...prev, teacher]);
    setTeacherIdMap((prev) => ({ ...prev, [teacher.id]: created.id }));
    return teacher;
  };

  const updateTeacher = async (
    teacher: AdminTeacherRecord,
    previousTeacherId?: number,
  ) => {
    const previousTeacher = teachers.find(
      (item) => item.id === (previousTeacherId ?? teacher.id),
    );
    const backendTeacherId =
      teacherIdMap[teacher.id] ??
      (previousTeacher ? teacherIdMap[previousTeacher.id] : undefined);
    if (!backendTeacherId) {
      setTeachers((prev) =>
        prev.map((item) =>
          item.id === (previousTeacherId ?? teacher.id) ? teacher : item,
        ),
      );
      return teacher;
    }

    // Map class names to IDs and subject names to IDs
    const classIds = teacher.classes.map((name) => classIdMap[name]).filter(Boolean);
    const mappedClassSubjects: Record<string, string[]> = {};

    Object.entries(teacher.classSubjects ?? {}).forEach(([className, subjects]) => {
      const classId = classIdMap[className];
      if (classId) {
        const availableSubjects = classSubjects[className] ?? [];
        mappedClassSubjects[classId] = subjects
          .map((subName) => availableSubjects.find((s) => s.name === subName)?.id)
          .filter((id): id is string => Boolean(id));
      }
    });

    await apiAuthRequest<BackendTeacher>(`/teachers/${backendTeacherId}`, {
      method: "PATCH",
      body: JSON.stringify({
        name: teacher.name,
        email: teacher.email,
        subject: teacher.subject,
        gender: teacher.gender,
        qualification: teacher.qualification,
        classes: classIds,
        classSubjects: mappedClassSubjects,
        status: teacher.status,
      }),
    });

    setTeachers((prev) =>
      prev.map((item) =>
        item.id === (previousTeacherId ?? teacher.id) ? teacher : item,
      ),
    );

    setTeacherIdMap((prev) => {
      const next = { ...prev };
      const previousId = previousTeacherId ?? previousTeacher?.id;
      if (previousId !== undefined && previousId !== teacher.id) {
        delete next[previousId];
      }
      next[teacher.id] = backendTeacherId;
      return next;
    });
    return teacher;
  };

  const deleteTeacher = async (teacherId: number) => {
    const backendTeacherId = teacherIdMap[teacherId];
    if (backendTeacherId) {
      await apiAuthRequest<{ id: string }>(`/teachers/${backendTeacherId}`, {
        method: "DELETE",
      });
    }

    setTeachers((prev) => prev.filter((teacher) => teacher.id !== teacherId));
    setTeacherIdMap((prev) => {
      const next = { ...prev };
      delete next[teacherId];
      return next;
    });
  };

  const resetTeacherPassword = async (teacherId: number) => {
    const backendTeacherId = teacherIdMap[teacherId];
    if (!backendTeacherId) {
      return String(teacherId);
    }

    const result = await apiAuthRequest<{ id: string; defaultPassword: string }>(
      `/teachers/${backendTeacherId}/reset-password`,
      {
        method: "POST",
      },
    );

    return result.defaultPassword;
  };

  const currentAcademicYear = () => {
    const now = new Date();
    const year = now.getFullYear();
    return `${year}-${year + 1}`;
  };

  const createClass = async (className: string, academicYear: string) => {
    const normalized = className.trim();
    if (!normalized) return;
    if (classIdMap[normalized]) return;

    await apiAuthRequest<BackendClass>("/classes", {
      method: "POST",
      body: JSON.stringify({
        name: normalized,
        academicYear: academicYear || currentAcademicYear(),
      }),
    });

    await refreshClassesFromServer();
  };

  const deleteClass = async (className: string) => {
    const classId = classIdMap[className];
    if (!classId) return;

    await apiAuthRequest<{ success: boolean }>(`/classes/${classId}`, {
      method: "DELETE",
    });

    await refreshClassesFromServer();
  };

  const addClassSubject = async (className: string, subject: string) => {
    const classId = classIdMap[className];
    if (!classId) return;

    const current = classSubjects[className] ?? [];
    if (current.some((s) => s.name === subject)) return;

    await apiAuthRequest<BackendClass>(`/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subjects: [...current, { id: crypto.randomUUID(), name: subject }],
      }),
    });

    await refreshClassesFromServer();
  };

  const deleteClassSubject = async (className: string, subjectId: string) => {
    const classId = classIdMap[className];
    if (!classId) return;

    const current = classSubjects[className] ?? [];
    const nextSubjects = current.filter((item) => item.id !== subjectId);

    await apiAuthRequest<BackendClass>(`/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subjects: nextSubjects,
      }),
    });

    await refreshClassesFromServer();
  };

  const updateClassSubject = async (
    className: string,
    subjectId: string,
    newName: string
  ) => {
    const classId = classIdMap[className];
    if (!classId) return;

    const current = classSubjects[className] ?? [];
    const nextSubjects = current.map((item) =>
      item.id === subjectId ? { ...item, name: newName } : item
    );

    await apiAuthRequest<BackendClass>(`/classes/${classId}`, {
      method: "PATCH",
      body: JSON.stringify({
        subjects: nextSubjects,
      }),
    });

    await refreshClassesFromServer();
  };

  const addAuditLog = (entry: Omit<AuditLogEntry, "id" | "createdAt">) => {
    const nextEntry: AuditLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs((prev) => [nextEntry, ...prev]);
  };

  return {
    announcements,
    setAnnouncements,
    students,
    setStudents,
    teachers,
    setTeachers,
    feeTransactions,
    setFeeTransactions,
    auditLogs,
    setAuditLogs,
    plannerAllocations,
    setPlannerAllocations,
    customClasses,
    setCustomClasses,
    classSubjects,
    setClassSubjects,
    backendClasses,
    setBackendClasses,
    addAuditLog,
    createAnnouncement,
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
    createPlannerAllocation,
    updatePlannerAllocation,
    deletePlannerAllocation,
    fetchAllPlannerAllocations,
    deleteAnnouncement,
    toggleHideAnnouncement,
  } as const;
};
