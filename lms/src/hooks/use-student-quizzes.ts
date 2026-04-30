import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiAuthRequest } from "@/lib/api";
import { toast } from "sonner";

export type BackendGradebookEntry = {
  id: string;
  subject: string;
  classGrade: string;
  term: string;
  assessment: string;
  totalMarks: number;
  marks: number | null;
};

// Type definitions for backend quizzes
export type BackendQuiz = {
  id: string;
  title: string;
  description?: string;
  classGrade: string;
  chapterName?: string;
  topicName?: string;
  dueDate: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctOptionId: string;
  }[];
  createdAt?: string;
};

export type BackendQuizSubmission = {
  id: string;
  quizId: string;
  studentId: string;
  submittedAt: string;
  score: number;
  total: number;
  checked: boolean;
  teacherFeedback?: string;
  answers: Array<{
    questionId: string;
    selectedOptionId: string;
  }>;
};

// Frontend types - mirrors MockTeacherQuiz structure
export type FrontendQuiz = {
  id: string;
  title: string;
  description: string;
  classGrade: string;
  chapterName: string;
  topicName: string;
  dueDate: string;
  questions: {
    id: string;
    text: string;
    options: { id: string; text: string }[];
    correctOptionId: string | null;
  }[];
  teacherName?: string;
  teacherId?: number;
  subject?: string;
  createdAt?: string;
  backendId?: string; // MongoDB ID from backend
};

export type FrontendQuizSubmission = {
  id: string;
  quizId: string;
  studentId: number;
  submittedAt: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  subject?: string;
  teacherName?: string;
  checked: boolean;
  backendId?: string;
  backendSubmissionId?: string;
};

export interface UseStudentQuizzesOptions {
  studentId: string;
  studentGrade: string;
}

const mapBackendQuizToFrontend = (
  quiz: BackendQuiz,
  index: number,
): FrontendQuiz => ({
  id: quiz.id || `quiz-${index}`,
  backendId: quiz.id,
  title: quiz.title,
  description: quiz.description || "",
  classGrade: quiz.classGrade,
  chapterName: quiz.chapterName || "",
  topicName: quiz.topicName || "",
  dueDate: quiz.dueDate,
  teacherName: quiz.teacherName,
  subject: quiz.subject,
  createdAt: quiz.createdAt,
  questions: (quiz.questions || []).map((q) => ({
    id: q.id,
    text: q.text,
    options: q.options || [],
    correctOptionId: q.correctOptionId,
  })),
});

const mapBackendSubmissionToFrontend = (
  submission: BackendQuizSubmission,
  studentId: number,
  quizzes: FrontendQuiz[],
): FrontendQuizSubmission => ({
  id: `sub-${submission.id}`,
  backendSubmissionId: submission.id,
  quizId: submission.quizId,
  studentId,
  submittedAt: submission.submittedAt,
  answers: Object.fromEntries(
    submission.answers.map((a) => [a.questionId, a.selectedOptionId]),
  ),
  score: submission.score,
  total: submission.total,
  subject: quizzes.find((quiz) => quiz.id === submission.quizId)?.subject,
  teacherName: quizzes.find((quiz) => quiz.id === submission.quizId)
    ?.teacherName,
  checked: submission.checked,
});

export const useStudentQuizzes = ({
  studentId,
  studentGrade,
}: UseStudentQuizzesOptions) => {
  const queryClient = useQueryClient();

  const { data: quizzes = [], isLoading: quizzesLoading } = useQuery({
    queryKey: ["student-quizzes", studentGrade],
    queryFn: async () => {
      const backendQuizzes = await apiAuthRequest<BackendQuiz[]>(
        `/quizzes?classGrade=${encodeURIComponent(studentGrade)}`,
      );
      return backendQuizzes.map(mapBackendQuizToFrontend);
    },
  });

  const { data: submissionsAndAssignments, isLoading: submissionsLoading } =
    useQuery({
      queryKey: ["student-submissions", studentId],
      queryFn: async () => {
        const [backendSubmissions, gradebookEntries] = await Promise.all([
          apiAuthRequest<BackendQuizSubmission[]>(
            "/quizzes/submissions/list",
          ).catch(() => []),
          apiAuthRequest<BackendGradebookEntry[]>(
            `/gradebook/students/${studentId}`,
          ).catch(() => []),
        ]);

        const mappedSubmissions = backendSubmissions.map((submission) =>
          mapBackendSubmissionToFrontend(
            submission,
            Number(studentId) || 0,
            quizzes,
          ),
        );

        return {
          submissions: mappedSubmissions,
          assignments: gradebookEntries,
        };
      },
      enabled: !!quizzes.length,
    });

  const submissions = submissionsAndAssignments?.submissions ?? [];
  const assignments = submissionsAndAssignments?.assignments ?? [];
  const isLoading = quizzesLoading || submissionsLoading;

  const submitQuizMutation = useMutation({
    mutationFn: async ({
      quizId,
      answers,
    }: {
      quizId: string;
      answers: Record<string, string>;
    }) => {
      const quiz = quizzes.find((q) => q.id === quizId);
      if (!quiz) throw new Error("Quiz not found");

      const submissionPayload = {
        studentId: "self",
        answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
          questionId,
          selectedOptionId,
        })),
      };

      const backendResponse = await apiAuthRequest<BackendQuizSubmission>(
        `/quizzes/${quizId}/submissions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(submissionPayload),
        },
      );

      return { backendResponse, quiz, answers };
    },
    onSuccess: ({ backendResponse, quiz, answers }) => {
      const frontendSubmission: FrontendQuizSubmission = {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        backendSubmissionId: backendResponse.id,
        quizId: quiz.id,
        studentId: Number(studentId) || 0,
        submittedAt: new Date().toISOString(),
        answers,
        score: quiz.questions.reduce((sum, q) => {
          const picked = answers[q.id];
          return picked && picked === q.correctOptionId ? sum + 1 : sum;
        }, 0),
        total: quiz.questions.length,
        subject: quiz.subject,
        teacherName: quiz.teacherName,
        checked: backendResponse.checked,
      };

      queryClient.setQueryData(["student-submissions", studentId], (old: any) => ({
        ...old,
        submissions: [frontendSubmission, ...(old?.submissions ?? [])],
      }));
      toast.success("Quiz submitted successfully!");
    },
  });

  return {
    quizzes,
    submissions,
    assignments,
    isLoading,
    submitQuiz: (quizId: string, answers: Record<string, string>) =>
      submitQuizMutation.mutateAsync({ quizId, answers }),
  };
};
