import { useEffect, useMemo, useState } from "react";
import type { AuditLogEntry } from "@/components/admin/types";
import { toast } from "sonner";
import {
  extractNumericId,
  formatTeacherPortalId,
  normalizeTeacherPortalId,
} from "@/lib/portal-ids";
import type { AdminTeacherRecord } from "./types";
import { GENDER_OPTIONS, getInitials, teacherCode } from "./utils";
import EnrollTeacherSection from "./enroll/EnrollTeacherSection";
import SearchTeacherSection from "./search/SearchTeacherSection";
import ResetTeacherSection from "./reset/ResetTeacherSection";

interface Props {
  teachers: AdminTeacherRecord[];
  onTeachersChange: (next: AdminTeacherRecord[]) => void;
  onAuditLog?: (entry: Omit<AuditLogEntry, "id" | "createdAt">) => void;
  currentAdmin?: string;
  initialSection?: Section;
  onCreateTeacher?: (teacher: AdminTeacherRecord) => Promise<AdminTeacherRecord>;
  onUpdateTeacher?: (
    teacher: AdminTeacherRecord,
    previousTeacherId?: number,
  ) => Promise<AdminTeacherRecord>;
  onDeleteTeacher?: (teacherId: number) => Promise<void>;
  onResetTeacherPassword?: (teacherId: number) => Promise<string>;
  classOptions?: string[];
  subjectOptions?: string[];
  classSubjectOptions?: Record<string, string[]>;
}

type Section = "enroll" | "search" | "reset";

type EnrollForm = {
  name: string;
  id: string;
  gender: string;
  qualification: string;
  classes: string[];
  classSubjects: Record<string, string[]>;
};

type EditForm = {
  name: string;
  id: number;
  gender: string;
  qualification: string;
  classes: string[];
  classSubjects: Record<string, string[]>;
};

type FormWithClasses = {
  classes: string[];
  classSubjects: Record<string, string[]>;
};

const AdminTeacher = ({
  teachers,
  onTeachersChange,
  onAuditLog,
  currentAdmin = "Admin User",
  initialSection = "enroll",
  onCreateTeacher,
  onUpdateTeacher,
  onDeleteTeacher,
  onResetTeacherPassword,
  classOptions: backendClassOptions = [],
  subjectOptions: backendSubjectOptions = [],
  classSubjectOptions: backendClassSubjectOptions = {},
}: Props) => {
  const nextTeacherIdentifier = useMemo(() => {
    const nextNumeric =
      teachers.reduce((max, teacher) => {
        const numeric = extractNumericId(teacher.employeeNo ?? String(teacher.id));
        return numeric && numeric > max ? numeric : max;
      }, 0) + 1;
    return formatTeacherPortalId(nextNumeric);
  }, [teachers]);

  const [activeSection, setActiveSection] = useState<Section>(initialSection);
  const [query, setQuery] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState<number | null>(null);
  const [resetId, setResetId] = useState("");

  const [enrollForm, setEnrollForm] = useState<EnrollForm>({
    name: "",
    id: nextTeacherIdentifier,
    gender: "Male",
    qualification: "",
    classes: [],
    classSubjects: {},
  });

  const [editingTeacherId, setEditingTeacherId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  
  useEffect(() => {
    setActiveSection(initialSection);
  }, [initialSection]);

  useEffect(() => {
    setEnrollForm((prev) =>
      prev.id.trim() ? prev : { ...prev, id: nextTeacherIdentifier },
    );
  }, [nextTeacherIdentifier]);

  const classOptions = useMemo(() => {
    return [...backendClassOptions].sort();
  }, [backendClassOptions]);

  const subjectOptions = useMemo(() => {
    return [...backendSubjectOptions].sort();
  }, [backendSubjectOptions]);

  const classSubjectOptions = useMemo(() => {
    return backendClassSubjectOptions;
  }, [backendClassSubjectOptions]);

  const enrollHasClassWithoutCourses = useMemo(
    () =>
      enrollForm.classes.some(
        (className) => (classSubjectOptions[className] ?? []).length === 0,
      ),
    [classSubjectOptions, enrollForm.classes],
  );

  const editHasClassWithoutCourses = useMemo(
    () =>
      (editForm?.classes ?? []).some(
        (className) => (classSubjectOptions[className] ?? []).length === 0,
      ),
    [classSubjectOptions, editForm?.classes],
  );

  const filteredTeachers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return teachers;

    return teachers.filter((t) => {
      const subjectText = t.subject.toLowerCase();
      const classesText = t.classes.join(" ").toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        String(t.id).includes(q) ||
        teacherCode(t.id).toLowerCase().includes(q) ||
        subjectText.includes(q) ||
        classesText.includes(q)
      );
    });
  }, [query, teachers]);

  const selectedTeacher = useMemo(
    () => teachers.find((t) => t.id === selectedTeacherId) || null,
    [selectedTeacherId, teachers],
  );

  const toggleClass = <T extends FormWithClasses>(
    form: T,
    setForm: (next: T) => void,
    className: string,
  ) => {
    const exists = form.classes.includes(className);
    if (exists) {
      const nextSubjects = { ...form.classSubjects };
      delete nextSubjects[className];
      setForm({
        ...form,
        classes: form.classes.filter((x) => x !== className),
        classSubjects: nextSubjects,
      });
    } else {
      setForm({
        ...form,
        classes: [...form.classes, className],
        classSubjects: { ...form.classSubjects, [className]: [] },
      });
    }
  };

  const toggleSubjectForClass = <T extends FormWithClasses>(
    form: T,
    setForm: (next: T) => void,
    className: string,
    subject: string,
  ) => {
    const current = form.classSubjects[className] || [];
    const next = current.includes(subject)
      ? current.filter((x) => x !== subject)
      : [...current, subject];
    setForm({
      ...form,
      classSubjects: { ...form.classSubjects, [className]: next },
    });
  };

  const enrollTeacher = async () => {
    const name = enrollForm.name.trim();
    const normalizedPortalId = normalizeTeacherPortalId(enrollForm.id);
    const numericId = extractNumericId(normalizedPortalId);
    const classes = enrollForm.classes;
    const gender = enrollForm.gender;
    const qualification = enrollForm.qualification.trim();

    if (!name || !normalizedPortalId || !numericId) {
      toast.error("Enter valid name and teacher ID like Ta-0001");
      return;
    }

    if (classes.length === 0) {
      toast.error("Assign at least one class");
      return;
    }

    if (!qualification) {
      toast.error("Enter qualification");
      return;
    }

    if (
      teachers.some(
        (t) =>
          t.id === numericId ||
          t.employeeNo?.toLowerCase() === normalizedPortalId.toLowerCase(),
      )
    ) {
      toast.error("Teacher ID must be unique");
      return;
    }

    const effectiveClassSubjects = classes.reduce<Record<string, string[]>>((acc, className) => {
      const current = enrollForm.classSubjects[className] || [];
      acc[className] = current;
      return acc;
    }, {});

    const hasMissingSubjects = classes.some(
      (className) => (effectiveClassSubjects[className] || []).length === 0,
    );
    if (hasMissingSubjects) {
      toast.error("Assign at least one subject for each selected class");
      return;
    }

    const allSubjects = Array.from(
      new Set(classes.flatMap((className) => effectiveClassSubjects[className] || [])),
    );

    const newTeacher: AdminTeacherRecord = {
      id: numericId,
      employeeNo: normalizedPortalId,
      name,
      gender,
      qualification,
      subject: allSubjects.join(", "),
      email: `${normalizedPortalId.toLowerCase().replace(/[^a-z0-9]/g, ".")}@school.edu`,
      avatar: getInitials(name),
      classes,
      students: 0,
      phone: "",
      address: "",
      dob: "1985-01-01",
      joinDate: new Date().toISOString().slice(0, 10),
      emergencyContact: "",
      emergencyPhone: "",
      classSubjects: effectiveClassSubjects,
    };

    try {
      if (onCreateTeacher) {
        await onCreateTeacher(newTeacher);
      } else {
        onTeachersChange([...teachers, newTeacher]);
      }
    } catch {
      toast.error("Failed to enroll teacher on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Teacher",
      action: "Enrolled Teacher",
      details: `${newTeacher.name} (${teacherCode(newTeacher.id)}) assigned ${newTeacher.classes.join(", ")}.`,
    });
    setEnrollForm({
      name: "",
      id: formatTeacherPortalId(numericId + 1),
      gender: "Male",
      qualification: "",
      classes: [],
      classSubjects: {},
    });
    toast.success(`Teacher enrolled. Login ID and default password: ${normalizedPortalId}`);
  };

  const startEditing = (teacher: AdminTeacherRecord) => {
    setEditingTeacherId(teacher.id);
    let classSubjects = teacher.classSubjects ? { ...teacher.classSubjects } : {};
    if (Object.keys(classSubjects).length === 0 && teacher.classes.length > 0) {
      const subjects = teacher.subject.split(",").map((s) => s.trim()).filter(Boolean);
      classSubjects = teacher.classes.reduce((acc, cls) => {
        acc[cls] = subjects;
        return acc;
      }, {} as Record<string, string[]>);
    }
    setEditForm({
      name: teacher.name,
      id: teacher.id,
      gender: teacher.gender || "Male",
      qualification: teacher.qualification || "",
      classes: [...teacher.classes],
      classSubjects,
    });
  };

  const cancelEdit = () => {
    setEditingTeacherId(null);
    setEditForm(null);
  };

  const saveEdit = async () => {
    if (!editForm || !editingTeacherId) return;

    const name = editForm.name.trim();
    const classes = editForm.classes;
    const gender = editForm.gender;
    const qualification = editForm.qualification.trim();

    if (!name) {
      toast.error("Name is required");
      return;
    }

    if (classes.length === 0) {
      toast.error("Assign at least one class");
      return;
    }

    if (!qualification) {
      toast.error("Enter qualification");
      return;
    }

    if (editForm.id !== editingTeacherId && teachers.some((t) => t.id === editForm.id)) {
      toast.error("Teacher ID already exists");
      return;
    }

    const effectiveClassSubjects = classes.reduce<Record<string, string[]>>((acc, className) => {
      const current = editForm.classSubjects[className] || [];
      acc[className] = current;
      return acc;
    }, {});

    const hasMissingSubjects = classes.some(
      (className) => (effectiveClassSubjects[className] || []).length === 0,
    );
    if (hasMissingSubjects) {
      toast.error("Assign at least one subject for each selected class");
      return;
    }

    const allSubjects = Array.from(
      new Set(classes.flatMap((className) => effectiveClassSubjects[className] || [])),
    );

    const updatedTeacher: AdminTeacherRecord = {
      ...teachers.find((t) => t.id === editingTeacherId)!,
      id: editForm.id,
      name,
      gender,
      qualification,
      subject: allSubjects.join(", "),
      classes,
      classSubjects: effectiveClassSubjects,
    };

    try {
      if (onUpdateTeacher) {
        await onUpdateTeacher(updatedTeacher, editingTeacherId);
      } else {
        const newTeachers = teachers.map((t) =>
          t.id === editingTeacherId ? updatedTeacher : t,
        );
        onTeachersChange(newTeachers);
      }
    } catch {
      toast.error("Failed to update teacher on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Teacher",
      action: "Updated Teacher",
      details: `${updatedTeacher.name} (${teacherCode(updatedTeacher.id)}) details updated.`,
    });
    setEditingTeacherId(null);
    setEditForm(null);
    toast.success("Teacher updated successfully.");
  };

  const deleteTeacher = async (teacher: AdminTeacherRecord) => {
    if (!window.confirm(`Are you sure you want to delete ${teacher.name}?`)) return;

    try {
      if (onDeleteTeacher) {
        await onDeleteTeacher(teacher.id);
      } else {
        const newTeachers = teachers.filter((t) => t.id !== teacher.id);
        onTeachersChange(newTeachers);
      }
    } catch {
      toast.error("Failed to delete teacher on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Teacher",
      action: "Deleted Teacher",
      details: `${teacher.name} (${teacherCode(teacher.id)}) removed.`,
    });
    if (selectedTeacherId === teacher.id) setSelectedTeacherId(null);
    toast.success("Teacher deleted.");
  };

  const resetPassword = async () => {
    const normalizedPortalId = normalizeTeacherPortalId(resetId);
    const numeric = extractNumericId(normalizedPortalId);
    if (!normalizedPortalId || !numeric) {
      toast.error("Enter teacher ID");
      return;
    }

    const target = teachers.find(
      (t) =>
        t.employeeNo?.toLowerCase() === normalizedPortalId.toLowerCase() ||
        t.id === numeric,
    );
    if (!target) {
      toast.error("Teacher not found");
      return;
    }

    let defaultPassword = target.employeeNo ?? teacherCode(target.id);
    try {
      if (onResetTeacherPassword) {
        defaultPassword = await onResetTeacherPassword(target.id);
      }
    } catch {
      toast.error("Failed to reset teacher password on server");
      return;
    }

    onAuditLog?.({
      actor: currentAdmin,
      module: "Security",
      action: "Reset Teacher Password",
      details: `Password reset for ${target.name} (${teacherCode(target.id)}).`,
    });
    toast.success(`Password reset. Default password is ${defaultPassword}`);
    setResetId("");
  };

  const handleToggleEnrollClass = (className: string) =>
    toggleClass(enrollForm, (next) => setEnrollForm(next), className);
  const handleToggleEnrollSubject = (className: string, subject: string) =>
    toggleSubjectForClass(enrollForm, (next) => setEnrollForm(next), className, subject);

  const handleToggleEditClass = (className: string) => {
    if (!editForm) return;
    toggleClass(editForm, (next) => setEditForm(next), className);
  };
  const handleToggleEditSubject = (className: string, subject: string) => {
    if (!editForm) return;
    toggleSubjectForClass(editForm, (next) => setEditForm(next), className, subject);
  };

  const handleEditFormChange = (next: EditForm) => setEditForm(next);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="section-header mb-0">
        <div>
          <h1 className="section-title">Teacher Administration</h1>
          <p className="section-subtitle">Enroll, assign classes, and maintain teacher access.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card p-4 block">
          <p className="stat-label">Total Teachers</p>
          <p className="stat-value">{teachers.length}</p>
        </div>
        <div className="stat-card p-4 block">
          <p className="stat-label">Classes Covered</p>
          <p className="stat-value">
            {new Set(teachers.flatMap((t) => t.classes)).size}
          </p>
        </div>
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
          Enroll Teacher
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
          Search Teacher
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
        <EnrollTeacherSection
          enrollForm={enrollForm}
          onChange={(next) => setEnrollForm(next)}
          onEnroll={() => {
            void enrollTeacher();
          }}
          classOptions={classOptions}
          subjectOptions={subjectOptions}
          classSubjectOptions={classSubjectOptions}
          disableSubmit={enrollHasClassWithoutCourses}
          genderOptions={GENDER_OPTIONS}
          onToggleClass={handleToggleEnrollClass}
          onToggleSubject={handleToggleEnrollSubject}
        />
      )}

      {activeSection === "search" && (
        <SearchTeacherSection
          query={query}
          onQueryChange={setQuery}
          filteredTeachers={filteredTeachers}
          selectedTeacherId={selectedTeacherId}
          onSelectTeacherId={setSelectedTeacherId}
          selectedTeacher={selectedTeacher}
          editingTeacherId={editingTeacherId}
          editForm={editForm}
          onEditFormChange={handleEditFormChange}
          onStartEditing={startEditing}
          onCancelEdit={cancelEdit}
          onSaveEdit={() => {
            void saveEdit();
          }}
          onDeleteTeacher={(teacher) => {
            void deleteTeacher(teacher);
          }}
          classOptions={classOptions}
          subjectOptions={subjectOptions}
          classSubjectOptions={classSubjectOptions}
          disableSave={editHasClassWithoutCourses}
          genderOptions={GENDER_OPTIONS}
          onToggleClass={handleToggleEditClass}
          onToggleSubject={handleToggleEditSubject}
        />
      )}

      {activeSection === "reset" && (
        <ResetTeacherSection
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

export default AdminTeacher;
