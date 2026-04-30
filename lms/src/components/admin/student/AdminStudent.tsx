import { useEffect, useMemo, useState } from "react";
import type { Student } from "@/types/domain";
import type { AuditLogEntry } from "@/components/admin/types";
import { toast } from "sonner";
import { apiAuthRequest } from "@/lib/api";
import {
  extractNumericId,
  formatStudentPortalId,
  normalizeStudentPortalId,
} from "@/lib/portal-ids";
import type { EnrollStudentForm } from "./types";
import { getInitials, studentCode } from "./utils";
import EnrollStudentSection from "./enroll/EnrollStudentSection";
import SearchStudentSection from "./search/SearchStudentSection";
import ResetStudentSection from "./reset/ResetStudentSection";

type BackendClass = {
  id: string;
  name: string;
  academicYear: string;
  subjects: { id: string; name: string }[];
};

interface Props {
  students: Student[];
  onStudentsChange: (next: Student[]) => void;
  onOpenFeeManagement: () => void;
  timetable?: {
    time: string;
    mon?: string;
    tue?: string;
    wed?: string;
    thu?: string;
    fri?: string;
  }[];
  onAuditLog?: (entry: Omit<AuditLogEntry, "id" | "createdAt">) => void;
  currentAdmin?: string;
  initialSection?: Section;
  initialSelectedStudentId?: number | null;
  onCreateStudent?: (student: Student) => Promise<Student>;
  onUpdateStudent?: (student: Student) => Promise<Student>;
  onDeleteStudent?: (studentId: number) => Promise<void>;
  onResetStudentPassword?: (studentId: number) => Promise<string>;
}

type Section = "enroll" | "search" | "reset";

const AdminStudent = ({
  students,
  onStudentsChange,
  onOpenFeeManagement,
  timetable = [],
  onAuditLog,
  currentAdmin = "Admin User",
  initialSection = "enroll",
  initialSelectedStudentId = null,
  onCreateStudent,
  onUpdateStudent,
  onDeleteStudent,
  onResetStudentPassword,
}: Props) => {
  const nextStudentIdentifier = useMemo(() => {
    const nextNumeric =
      students.reduce((max, student) => {
        const numeric = extractNumericId(student.admissionNo ?? String(student.id));
        return numeric && numeric > max ? numeric : max;
      }, 0) + 1;
    return formatStudentPortalId(nextNumeric);
  }, [students]);

  const [activeSection, setActiveSection] = useState<Section>(initialSection);

  const [enrollForm, setEnrollForm] = useState<EnrollStudentForm>({
    name: "",
    id: nextStudentIdentifier,
    gender: "",
    guardian: "",
    guardianPhone: "",
    className: "",
    subjects: [],
  });

  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [editableStudent, setEditableStudent] = useState<Student | null>(null);

  const [resetId, setResetId] = useState("");
  const [lastEnrolledId, setLastEnrolledId] = useState<number | null>(null);
  const [backendClasses, setBackendClasses] = useState<BackendClass[]>([]);

  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setEnrollForm((prev) =>
      prev.id.trim() ? prev : { ...prev, id: nextStudentIdentifier },
    );
  }, [nextStudentIdentifier]);

  useEffect(() => {
    if (initialSelectedStudentId === null || initialSelectedStudentId === undefined) {
      return;
    }
    setSelectedStudentId(initialSelectedStudentId);
  }, [initialSelectedStudentId]);

  useEffect(() => {
    let mounted = true;

    const loadClasses = async () => {
      try {
        const rows = await apiAuthRequest<BackendClass[]>("/classes");
        if (!mounted) return;
        setBackendClasses(rows);
      } catch {
        // Keep local fallback options when classes API is unavailable.
      }
    };

    void loadClasses();

    return () => {
      mounted = false;
    };
  }, []);

  const classes = useMemo(() => {
    return backendClasses
      .map((entry) => entry.name)
      .filter(Boolean)
      .sort();
  }, [backendClasses]);

  const classSubjectOptions = useMemo(() => {
    return backendClasses.reduce<Record<string, string[]>>((acc, entry) => {
      const names = (entry.subjects ?? []).map((s) => s.name);
      const unique = Array.from(new Set(names)).sort();
      acc[entry.name] = unique;
      return acc;
    }, {});
  }, [backendClasses]);

  const subjectOptions = useMemo(() => {
    const fromClasses = Object.values(classSubjectOptions).flat();
    const fromStudents = students.flatMap((s) => s.tests.map((t) => t.subject));
    return Array.from(new Set([...fromClasses, ...fromStudents])).sort();
  }, [classSubjectOptions, students]);

  const activeSubjectOptions =
    enrollForm.className && classSubjectOptions[enrollForm.className]
      ? classSubjectOptions[enrollForm.className]
      : [];

  const pendingFeeCount = students.filter((s) => s.fees.pending > 0).length;

  const filteredStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        String(s.id).includes(q) ||
        studentCode(s.id).toLowerCase().includes(q),
    );
  }, [query, students]);

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) || null,
    [selectedStudentId, students],
  );

  useEffect(() => {
    if (!selectedStudent) {
      setEditableStudent(null);
      return;
    }
    setEditableStudent({ ...selectedStudent });
  }, [selectedStudent]);

  const toggleEnrollSubject = (subject: string) => {
    setEnrollForm((prev) => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter((x) => x !== subject)
        : [...prev.subjects, subject],
    }));
  };

  const enrollStudent = async () => {
    const name = enrollForm.name.trim();
    const className = enrollForm.className.trim();
    const normalizedPortalId = normalizeStudentPortalId(enrollForm.id);
    const numericId = extractNumericId(normalizedPortalId);
    const guardianName = enrollForm.guardian.trim();
    const guardianPhone = enrollForm.guardianPhone.trim();
    const gender = enrollForm.gender.trim();

    if (!name) {
      toast.error("Enter student name");
      return;
    }

    if (!className) {
      if (classes.length === 0) {
        toast.error("No classes found. Please create class first.");
      } else {
        toast.error("Select class");
      }
      return;
    }

    if (!normalizedPortalId || !numericId) {
      toast.error("Enter valid student ID like Stu-0001");
      return;
    }

    if (!gender) {
      toast.error("Select gender");
      return;
    }

    if (!guardianName || !guardianPhone) {
      toast.error("Enter guardian name and phone");
      return;
    }

    if (guardianName.length > 100) {
      toast.error("Guardian name is too long (max 100 characters)");
      return;
    }

    if (!/^[+0-9\-()\s]{7,20}$/.test(guardianPhone)) {
      toast.error("Enter valid guardian phone (7-20 chars)");
      return;
    }

    if (
      students.some(
        (s) =>
          s.id === numericId ||
          s.admissionNo?.toLowerCase() === normalizedPortalId.toLowerCase(),
      )
    ) {
      toast.error("Student ID must be unique");
      return;
    }

    const selectedSubjects =
      enrollForm.subjects.length > 0 ? enrollForm.subjects : activeSubjectOptions;

    if (selectedSubjects.length === 0) {
      toast.error("No courses found for selected class");
      return;
    }

    const newStudent: Student = {
      id: numericId,
      admissionNo: normalizedPortalId,
      name,
      email: `${normalizedPortalId.toLowerCase().replace(/[^a-z0-9]/g, ".")}@school.edu`,
      grade: className,
      avatar: getInitials(name),
      gender,
      dob: "2010-01-01",
      phone: "",
      guardian: guardianName,
      guardianPhone,
      address: "",
      enrollDate: new Date().toISOString().slice(0, 10),
      status: "Active",
      attendance: { present: 0, absent: 0, late: 0, total: 0 },
      tests: selectedSubjects.map((subject) => ({
        subject,
        test: "Initial Enrollment",
        marks: 0,
        total: 100,
        date: new Date().toISOString().slice(0, 10),
        grade: "N/A",
      })),
      progress: [],
      assignments: [],
      behavior: [],
      fees: { total: 45000, paid: 0, pending: 45000, status: "Pending" },
    };

    try {
      if (onCreateStudent) {
        await onCreateStudent(newStudent);
      } else {
        onStudentsChange([...students, newStudent]);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to enroll student on server";
      toast.error(message);
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Student",
      action: "Enrolled Student",
      details: `${newStudent.name} (${studentCode(newStudent.id)}) enrolled in ${newStudent.grade}.`,
    });
    setLastEnrolledId(numericId);
    setEnrollForm({
      name: "",
      id: formatStudentPortalId(numericId + 1),
      gender: "",
      guardian: "",
      guardianPhone: "",
      className: "",
      subjects: [],
    });
    toast.success(`Student enrolled. Login ID and default password: ${normalizedPortalId}`);
  };

  const resetPassword = async () => {
    const trimmed = resetId.trim();
    if (!trimmed) {
      toast.error("Enter student ID");
      return;
    }

    const normalizedPortalId = normalizeStudentPortalId(trimmed);
    const numeric = extractNumericId(normalizedPortalId);
    const target = students.find(
      (s) =>
        (normalizedPortalId &&
          s.admissionNo?.toLowerCase() === normalizedPortalId.toLowerCase()) ||
        (numeric !== null && s.id === numeric),
    );

    if (!target) {
      toast.error("Student not found");
      return;
    }

    let defaultPassword = target.admissionNo ?? studentCode(target.id);
    try {
      if (onResetStudentPassword) {
        defaultPassword = await onResetStudentPassword(target.id);
      }
    } catch {
      toast.error("Failed to reset student password on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Security",
      action: "Reset Student Password",
      details: `Password reset for ${target.name} (${studentCode(target.id)}).`,
    });
    toast.success(`Password reset. Default password is ${defaultPassword}`);
    setResetId("");
  };

  const toggleEditableSubject = (subject: string) => {
    if (!editableStudent) return;

    const hasSubject = editableStudent.tests.some((t) => t.subject === subject);
    const nextTests = hasSubject
      ? editableStudent.tests.filter((t) => t.subject !== subject)
      : [
          ...editableStudent.tests,
          {
            subject,
            test: "Enrollment Subject",
            marks: 0,
            total: 100,
            date: new Date().toISOString().slice(0, 10),
            grade: "N/A",
          },
        ];

    setEditableStudent({ ...editableStudent, tests: nextTests });
  };

  const saveStudentUpdates = async () => {
    if (!editableStudent) return;

    try {
      if (onUpdateStudent) {
        await onUpdateStudent(editableStudent);
      } else {
        const next = students.map((s) => (s.id === editableStudent.id ? editableStudent : s));
        onStudentsChange(next);
      }
    } catch {
      toast.error("Failed to update student on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Student",
      action: "Updated Student Profile",
      details: `${editableStudent.name} (${studentCode(editableStudent.id)}) information updated.`,
    });
    toast.success("Student information updated");
  };

  const deleteStudent = async (student: Student) => {
    if (!window.confirm(`Are you sure you want to delete ${student.name}?`)) return;

    try {
      if (onDeleteStudent) {
        await onDeleteStudent(student.id);
      } else {
        const next = students.filter((s) => s.id !== student.id);
        onStudentsChange(next);
      }
    } catch {
      toast.error("Failed to delete student on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Student",
      action: "Deleted Student",
      details: `${student.name} (${studentCode(student.id)}) removed.`,
    });
    if (selectedStudentId === student.id) setSelectedStudentId(null);
    toast.success("Student deleted.");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header mb-0">
        <div>
          <h1 className="section-title">Student Administration</h1>
          <p className="section-subtitle">Manage enrollment, profile updates, and credential resets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card p-4 block">
          <p className="stat-label">Total Student Strength</p>
          <p className="stat-value">{students.length}</p>
        </div>

        <button
          onClick={onOpenFeeManagement}
          className="stat-card card-hover p-4 block text-left hover:scale-[1.01]"
        >
          <p className="stat-label">Students With Pending Fee</p>
          <p className="stat-value text-destructive">{pendingFeeCount}</p>
          <p className="text-xs text-primary mt-1">Open fee management</p>
        </button>
      </div>

      <div className="tabs flex-wrap gap-2 border-0">
        <button
          onClick={() => setActiveSection("enroll")}
          className={`tab rounded-lg text-sm border ${
            activeSection === "enroll"
              ? "tab-active bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
          aria-pressed={activeSection === "enroll"}
        >
          Enroll Student
        </button>
        <button
          onClick={() => setActiveSection("search")}
          className={`tab rounded-lg text-sm border ${
            activeSection === "search"
              ? "tab-active bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
          aria-pressed={activeSection === "search"}
        >
          Search Student
        </button>
        <button
          onClick={() => setActiveSection("reset")}
          className={`tab rounded-lg text-sm border ${
            activeSection === "reset"
              ? "tab-active bg-primary text-primary-foreground border-primary"
              : "bg-card border-border hover:border-primary/40 hover:bg-muted/30"
          }`}
          aria-pressed={activeSection === "reset"}
        >
          Reset Password
        </button>
      </div>

      {activeSection === "enroll" && (
        <EnrollStudentSection
          enrollForm={enrollForm}
          onChange={(next) => setEnrollForm(next)}
          onEnroll={() => {
            void enrollStudent();
          }}
          classes={classes}
          activeSubjectOptions={activeSubjectOptions}
          onToggleSubject={toggleEnrollSubject}
          lastEnrolledId={lastEnrolledId}
        />
      )}

      {activeSection === "search" && (
        <SearchStudentSection
          query={query}
          onQueryChange={setQuery}
          filteredStudents={filteredStudents}
          selectedStudentId={selectedStudentId}
          onSelectStudentId={setSelectedStudentId}
          editableStudent={editableStudent}
          onEditableStudentChange={(next) => setEditableStudent(next)}
          onToggleSubject={toggleEditableSubject}
          subjectOptions={subjectOptions}
          onSave={() => {
            void saveStudentUpdates();
          }}
          onDelete={(student) => {
            void deleteStudent(student);
          }}
          timetable={timetable}
          classes={classes}
        />
      )}

      {activeSection === "reset" && (
        <ResetStudentSection
          resetId={resetId}
          onResetIdChange={setResetId}
          onReset={() => {
            void resetPassword();
          }}
        />
      )}
    </div>
  );
};

export default AdminStudent;
