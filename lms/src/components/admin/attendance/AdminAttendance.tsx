import { useEffect, useMemo, useState } from "react";
import { apiAuthRequest } from "@/lib/api";
import AttendanceDetails from "./components/AttendanceDetails";
import AttendanceFilters from "./components/AttendanceFilters";
import StudentList from "./components/StudentList";
import type {
  AdminAttendanceProps,
  AttendanceRecord,
  AttendanceStatus,
} from "./types/attendance";

type TeacherAttendancePayload = {
  id: string;
  className: string;
  teacherName: string;
  date: string;
  time: string;
  classType?: string;
  roomOrMode?: string;
  entries: { studentId: string; status: AttendanceStatus }[];
};

type BackendAttendanceSession = {
  id: string;
  className: string;
  teacherName: string;
  date: string;
  time: string;
  classType?: string;
  roomOrMode?: string;
  entries: { studentId: string; status: AttendanceStatus }[];
};

const buildLogsFromSubmissions = (
  students: AdminAttendanceProps["students"] = [],
  submissions: TeacherAttendancePayload[]
) => {
  const logs: Record<number, AttendanceRecord[]> = {};
  const backendToStudentId = new Map(
    students
      .filter((student) => !!student.backendId)
      .map((student) => [student.backendId as string, student.id]),
  );
  students.forEach((student) => {
    logs[student.id] = [];
  });

  submissions.forEach((payload) => {
    const day = new Date(payload.date).toLocaleDateString("en-US", {
      weekday: "short",
    });
    payload.entries.forEach((entry) => {
      const studentId = backendToStudentId.get(entry.studentId);
      if (!studentId || !logs[studentId]) return;
      logs[studentId].push({
        id: `${payload.id}::${entry.studentId}`,
        date: payload.date,
        day,
        time: payload.time,
        className: payload.className,
        status: entry.status,
      });
    });
  });

  Object.values(logs).forEach((records) => {
    records.sort((a, b) => b.date.localeCompare(a.date));
  });

  return logs;
};

const AdminAttendance = ({ students = [], allTeacherClasses = [] }: AdminAttendanceProps) => {
  const getClassName = (clsId: string) => {
    const classObj = allTeacherClasses.find((c) => c.id === clsId);
    return classObj ? classObj.name : clsId;
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState<string>("All Classes");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [activeStatusFilter, setActiveStatusFilter] = useState<AttendanceStatus | null>(
    null
  );
  const [activeSubjectFilter, setActiveSubjectFilter] = useState<string>("All Subjects");
  const [teacherSubmissions, setTeacherSubmissions] = useState<
    TeacherAttendancePayload[]
  >([]);

  const attendanceLogs = useMemo(
    () => buildLogsFromSubmissions(students, teacherSubmissions),
    [students, teacherSubmissions]
  );

  const normalizedQuery = searchQuery.trim().toLowerCase();
  
  const classIdToNameMap = useMemo(() => {
    const map = new Map<string, string>();
    allTeacherClasses.forEach((cls) => {
      map.set(cls.id, cls.name);
    });
    return map;
  }, [allTeacherClasses]);

  const classOptions = useMemo(() => {
    const set = new Set(students.map((s) => s.grade));
    teacherSubmissions.forEach((entry) => set.add(entry.className));
    const ids = Array.from(set).sort((a, b) => a.localeCompare(b));
    const displayNames = ids.map((id) => classIdToNameMap.get(id) || id);
    return ["All Classes", ...displayNames];
  }, [students, teacherSubmissions, classIdToNameMap]);

  const classSummary = useMemo(() => {
    const map = new Map<string, { submissions: number; entries: number; lastDate?: string }>();
    teacherSubmissions.forEach((payload) => {
      const current = map.get(payload.className) || { submissions: 0, entries: 0 };
      current.submissions += 1;
      current.entries += payload.entries.length;
      if (!current.lastDate || payload.date > current.lastDate) {
        current.lastDate = payload.date;
      }
      map.set(payload.className, current);
    });
    return Array.from(map.entries()).map(([classId, info]) => ({
      classId,
      className: classIdToNameMap.get(classId) || classId,
      ...info,
    }));
  }, [teacherSubmissions, classIdToNameMap]);

  const filteredStudents = useMemo(() => {
    let classId = selectedClass;
    if (selectedClass !== "All Classes") {
      // Convert display name back to ID if needed
      for (const [id, name] of classIdToNameMap.entries()) {
        if (name === selectedClass) {
          classId = id;
          break;
        }
      }
    }
    
    return students.filter((student) => {
      const classMatch = classId === "All Classes" || student.grade === classId;
      if (!classMatch) return false;
      if (!normalizedQuery) return true;
      const nameMatch = student.name.toLowerCase().includes(normalizedQuery);
      const idMatch = `${student.id}`.includes(normalizedQuery);
      return nameMatch || idMatch;
    });
  }, [normalizedQuery, selectedClass, students, classIdToNameMap]);

  useEffect(() => {
    let mounted = true;

    const readSubmissions = async () => {
      try {
        const sessions = await apiAuthRequest<BackendAttendanceSession[]>(
          "/attendance/sessions",
        );
        if (!mounted) return;
        setTeacherSubmissions(sessions);
      } catch {
        if (!mounted) return;
        setTeacherSubmissions([]);
      }
    };

    void readSubmissions();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (selectedStudentId && !students.some((student) => student.id === selectedStudentId)) {
      setSelectedStudentId(null);
    }
  }, [selectedStudentId, students]);

  const selectedStudent = students.find((student) => student.id === selectedStudentId) ?? null;
  const selectedLog = useMemo(() => {
    if (!selectedStudent) return [];
    return attendanceLogs[selectedStudent.id] ?? [];
  }, [attendanceLogs, selectedStudent]);
  const subjectOptions = useMemo(() => {
    if (!selectedStudent) return ["All Subjects"];
    const courseSet = new Set<string>();
    selectedLog.forEach((record) => courseSet.add(record.className));
    return ["All Subjects", ...Array.from(courseSet).sort((a, b) => a.localeCompare(b))];
  }, [selectedLog, selectedStudent]);

  const subjectFilteredLog = useMemo(() => {
    if (!selectedStudent) return [];
    if (activeSubjectFilter === "All Subjects") return selectedLog;
    return selectedLog.filter((record) => record.className === activeSubjectFilter);
  }, [activeSubjectFilter, selectedLog, selectedStudent]);

  const statusCounts = useMemo(() => {
    return subjectFilteredLog.reduce(
      (acc, record) => {
        acc[record.status] += 1;
        return acc;
      },
      { Present: 0, Absent: 0, Late: 0, Leave: 0 } as Record<AttendanceStatus, number>
    );
  }, [subjectFilteredLog]);

  const visibleRecords = useMemo(() => {
    if (!activeStatusFilter) return subjectFilteredLog;
    return subjectFilteredLog.filter((record) => record.status === activeStatusFilter);
  }, [activeStatusFilter, subjectFilteredLog]);

  const updateRecordStatus = async (recordId: string, status: AttendanceStatus) => {
    if (!selectedStudent) return;

    const [payloadId, backendStudentId] = recordId.split("::");
    if (!payloadId || !backendStudentId) return;

    try {
      await apiAuthRequest<BackendAttendanceSession>(
        `/attendance/entries/${encodeURIComponent(payloadId)}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            studentId: backendStudentId,
            status,
          }),
        },
      );

      setTeacherSubmissions((prev) =>
        prev.map((payload) => {
          if (payload.id !== payloadId) return payload;
          return {
            ...payload,
            entries: payload.entries.map((entry) =>
              entry.studentId === backendStudentId ? { ...entry, status } : entry,
            ),
          };
        }),
      );
    } catch {
      return;
    }
  };

  return (
    <div>
      {teacherSubmissions.length === 0 && (
        <div className="mb-4 rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
          No attendance submissions yet. Ask teachers to submit attendance to see
          records here.
        </div>
      )}

      {classSummary.length > 0 && (
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {classSummary.map((entry) => (
            <button
              key={entry.className}
              type="button"
              onClick={() => setSelectedClass(entry.className)}
              className="rounded-xl border border-border bg-card p-4 text-left hover:border-primary/40"
            >
              <p className="text-xs text-muted-foreground">Class</p>
              <p className="text-lg font-semibold text-foreground">{entry.className}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Submissions: {entry.submissions} · Students: {entry.entries}
              </p>
              {entry.lastDate && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last submitted: {entry.lastDate}
                </p>
              )}
            </button>
          ))}
        </div>
      )}

      <AttendanceFilters
        selectedClass={selectedClass}
        onSelectClass={setSelectedClass}
        classOptions={classOptions}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        filteredCount={filteredStudents.length}
        totalCount={students.length}
      />

      <StudentList
        students={filteredStudents}
        allTeacherClasses={allTeacherClasses}
        onSelectStudent={(student) => {
          setSelectedStudentId(student.id);
          setActiveStatusFilter(null);
          setActiveSubjectFilter("All Subjects");
        }}
      />

      {selectedStudent && (
        <AttendanceDetails
          selectedStudent={selectedStudent}
          subjectOptions={subjectOptions}
          activeSubjectFilter={activeSubjectFilter}
          onSubjectFilterChange={setActiveSubjectFilter}
          statusCounts={statusCounts}
          activeStatusFilter={activeStatusFilter}
          onStatusFilterChange={setActiveStatusFilter}
          visibleRecords={visibleRecords}
          subjectFilteredTotal={subjectFilteredLog.length}
          onClose={() => setSelectedStudentId(null)}
          onUpdateRecordStatus={updateRecordStatus}
        />
      )}
    </div>
  );
};

export default AdminAttendance;
