import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Clock, XCircle } from "lucide-react";
import {
  type Student,
  type Teacher,
  type TeacherAssignment,
} from "@/types/domain";
import { toast } from "sonner";
import { apiAuthRequest } from "@/lib/api";
import { loadAuthSession } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import CreateAssignmentView, {
  type NewAssignmentDraft,
} from "./create/CreateAssignmentView";
import AssignmentDetailView from "./detail/AssignmentDetailView";
import AssignmentsListView from "./list/AssignmentsListView";

interface Props {
  teacher: Teacher;
  students?: Student[];
  allTeacherClasses?: { id: string; name: string }[];
}

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    Submitted: "bg-success/15 text-success",
    Graded: "bg-success/15 text-success",
    Late: "bg-warning/15 text-warning",
    Missing: "bg-destructive/15 text-destructive",
    Pending: "bg-muted text-muted-foreground",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const statusIcon = (s: string) => {
  if (s === "Submitted") return <CheckCircle className="h-3.5 w-3.5" />;
  if (s === "Graded") return <CheckCircle className="h-3.5 w-3.5" />;
  if (s === "Late") return <Clock className="h-3.5 w-3.5" />;
  if (s === "Missing") return <XCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

type BackendAssignment = {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  dueDate: string;
  teacherId: string;
  teacherName: string;
  totalMarks: number;
  description?: string;
  instructions?: string;
  assignedStudentIds: string[];
};

type BackendAssignmentSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  status: string;
  files?: Array<{ secureUrl?: string; publicId?: string; format?: string }>;
  marks?: number;
  feedback?: string;
};

type LocalTeacherAssignment = TeacherAssignment & {
  backendId: string;
};

const TeacherAssignments = ({
  teacher,
  students = [],
  allTeacherClasses = [],
}: Props) => {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "detail" | "create">("list");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);

  const [gradingStudent, setGradingStudent] = useState<number | null>(null);
  const [gradingMarks, setGradingMarks] = useState("");
  const [gradingFeedback, setGradingFeedback] = useState("");

  const [filterClass, setFilterClass] = useState<string>("all");

  const [newAssignment, setNewAssignment] = useState<NewAssignmentDraft>({
    title: "",
    classGrade: teacher.classes[0] || "10-A",
    dueDate: "",
    totalMarks: 20,
    description: "",
    question: "",
    chapterName: "",
    chapterNumber: 1,
    submissionType: "Handwritten" as "Handwritten" | "Word" | "PDF",
    instructions: "",
    assignedStudentIds: [],
  });

  const studentById = useMemo(
    () => new Map(students.map((student) => [student.id, student])),
    [students],
  );

  const buildAssignmentsFromBackend = (
    backendAssignments: BackendAssignment[],
    submissionsPerAssignment: BackendAssignmentSubmission[][],
  ) => {
    const nextSubmissionIds: Record<string, Record<number, string>> = {};

    const mappedAssignments: LocalTeacherAssignment[] = backendAssignments.map(
      (assignment, index) => {
        const backendSubmissions = submissionsPerAssignment[index] ?? [];
        const submissionMap: Record<number, string> = {};

        const mappedSubmissions = backendSubmissions.map((submission) => {
          const student = students.find(
            (item) => item.backendId === submission.studentId,
          );
          if (student) {
            submissionMap[student.id] = submission.id;
          }

          const file = submission.files?.[0];
          const fileName = file?.publicId
            ? file.publicId.split("/").pop()
            : file?.secureUrl
            ? file.secureUrl.split("/").pop()
            : undefined;
          const fileUrl = file?.secureUrl || undefined;

          return {
            studentId: student?.id ?? 0,
            studentName: student?.name ?? `Student #${submission.studentId}`,
            studentAvatar: student?.avatar ?? "ST",
            status: submission.status,
            submittedDate: submission.submittedAt,
            fileName,
            fileUrl,
            marks: submission.marks,
            feedback: submission.feedback,
          };
        });

        nextSubmissionIds[assignment.id] = submissionMap;

        return {
          id: index + 1,
          backendId: assignment.id,
          title: assignment.title,
          subject: assignment.subject,
          classGrade: assignment.classGrade,
          dueDate: assignment.dueDate,
          totalMarks: assignment.totalMarks,
          description: assignment.description || "",
          createdDate: assignment.dueDate,
          question: assignment.description,
          chapterName: undefined,
          chapterNumber: undefined,
          submissionType: undefined,
          instructions: assignment.instructions,
          assignedStudentIds: assignment.assignedStudentIds
            .map(
              (studentId) =>
                students.find((student) => student.backendId === studentId)?.id,
            )
            .filter((value): value is number => typeof value === "number"),
          submissions: mappedSubmissions,
        };
      },
    );

    return { mappedAssignments, nextSubmissionIds };
  };

  const { data: assignmentsData, isLoading: loading } = useQuery({
    queryKey: [
      "teacher-assignments",
      teacher.id,
      teacher.backendId,
      teacher.subject,
    ],
    queryFn: async () => {
      const authTeacherId = loadAuthSession()?.user.id ?? "";
      const query = authTeacherId
        ? `/assignments?teacherId=${encodeURIComponent(authTeacherId)}`
        : teacher.backendId
        ? `/assignments?teacherId=${encodeURIComponent(teacher.backendId)}`
        : `/assignments?subject=${encodeURIComponent(teacher.subject)}`;

      const response = await apiAuthRequest<BackendAssignment[]>(query);

      const submissionResults = await Promise.allSettled(
        response.map((assignment) =>
          apiAuthRequest<BackendAssignmentSubmission[]>(
            `/assignments/submissions/list?assignmentId=${encodeURIComponent(assignment.id)}`,
          ),
        ),
      );

      const submissionsPerAssignment = submissionResults.map((result) =>
        result.status === "fulfilled" ? result.value : [],
      );

      const { mappedAssignments, nextSubmissionIds } =
        buildAssignmentsFromBackend(response, submissionsPerAssignment);

      return {
        assignments: mappedAssignments,
        submissionIdsByAssignmentId: nextSubmissionIds,
      };
    },
  });

  const assignments = assignmentsData?.assignments ?? [];
  const submissionIdsByAssignmentId =
    assignmentsData?.submissionIdsByAssignmentId ?? {};

  const filteredAssignments =
    filterClass === "all"
      ? assignments
      : assignments.filter((a) => a.classGrade === filterClass);

  const selectedAssignment = useMemo(
    () => assignments.find((a) => a.backendId === selectedAssignmentId) || null,
    [assignments, selectedAssignmentId]
  );

  const createAssignmentMutation = useMutation({
    mutationFn: async (payload: any) => {
      return apiAuthRequest<BackendAssignment>("/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments", teacher.id] });
      setNewAssignment({
        title: "",
        classGrade: teacher.classes[0] || "10-A",
        dueDate: "",
        totalMarks: 20,
        description: "",
        question: "",
        chapterName: "",
        chapterNumber: 1,
        submissionType: "Handwritten",
        instructions: "",
        assignedStudentIds: [],
      });
      setView("list");
      toast.success("Assignment created successfully!");
    },
    onError: () => {
      toast.error("Failed to create assignment.");
    },
  });

  const handleCreateAssignment = async () => {
    if (
      !newAssignment.title ||
      !newAssignment.dueDate ||
      !newAssignment.question ||
      !newAssignment.instructions
    ) {
      toast.error("Please fill all required fields!");
      return;
    }

    const selectedBackendStudentIds = newAssignment.assignedStudentIds
      .map((studentId) => studentById.get(studentId)?.backendId)
      .filter((studentId): studentId is string => Boolean(studentId));

    createAssignmentMutation.mutate({
      title: newAssignment.title,
      subject: teacher.subject,
      classGrade: newAssignment.classGrade,
      dueDate: newAssignment.dueDate,
      totalMarks: newAssignment.totalMarks,
      description: newAssignment.description || newAssignment.question,
      instructions: newAssignment.instructions,
      assignedStudentIds: selectedBackendStudentIds,
    });
  };

  const gradeSubmissionMutation = useMutation({
    mutationFn: async ({
      submissionId,
      marks,
      feedback,
    }: {
      submissionId: string;
      marks: number;
      feedback?: string;
    }) => {
      return apiAuthRequest<BackendAssignmentSubmission>(
        `/assignments/submissions/${submissionId}/grade`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marks, feedback }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teacher-assignments", teacher.id] });
      setGradingStudent(null);
      setGradingMarks("");
      setGradingFeedback("");
      toast.success("Marks saved successfully!");
    },
    onError: () => {
      toast.error("Failed to save marks.");
    },
  });

  const handleGradeSubmission = async () => {
    if (!selectedAssignment || gradingStudent === null) return;

    const marks = Number(gradingMarks);
    if (isNaN(marks) || marks < 0 || marks > selectedAssignment.totalMarks) {
      toast.error(`Marks must be between 0 and ${selectedAssignment.totalMarks}`);
      return;
    }

    const backendSubmissionId =
      submissionIdsByAssignmentId[selectedAssignment.backendId]?.[gradingStudent];
    if (!backendSubmissionId) {
      toast.error(
        "Could not find the matching backend submission. Refresh and try again.",
      );
      return;
    }

    gradeSubmissionMutation.mutate({
      submissionId: backendSubmissionId,
      marks,
      feedback: gradingFeedback.trim() || undefined,
    });
  };

  if (view === "create") {
    return (
      <CreateAssignmentView
        teacher={teacher}
        students={students}
        allTeacherClasses={allTeacherClasses}
        newAssignment={newAssignment}
        onChange={setNewAssignment}
        onCreate={handleCreateAssignment}
        onBack={() => setView("list")}
      />
    );
  }

  if (view === "detail" && selectedAssignment) {
    return (
      <AssignmentDetailView
        selectedAssignment={selectedAssignment}
        allTeacherClasses={allTeacherClasses}
        gradingStudent={gradingStudent}
        gradingMarks={gradingMarks}
        gradingFeedback={gradingFeedback}
        onBack={() => {
          setView("list");
          setSelectedAssignmentId(null);
          setGradingStudent(null);
        }}
        onSaveMarks={handleGradeSubmission}
        onSetGradingStudent={setGradingStudent}
        onSetGradingMarks={setGradingMarks}
        onSetGradingFeedback={setGradingFeedback}
        statusColor={statusColor}
        statusIcon={statusIcon}
      />
    );
  }

  return (
    <>
      {loading && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Loading assignments...
        </div>
      )}
      <AssignmentsListView
        teacher={teacher}
        assignments={filteredAssignments}
        filterClass={filterClass}
        onFilterClass={setFilterClass}
        onCreate={() => setView("create")}
        allTeacherClasses={allTeacherClasses}
        onSelectAssignment={(assignment) => {
          setSelectedAssignmentId(
            (assignment as LocalTeacherAssignment).backendId,
          );
          setView("detail");
        }}
      />
    </>
  );
};

export default TeacherAssignments;
