import { useMemo } from "react";
import { type MockTeacherQuiz } from "@/types/domain";
import { apiAuthRequest } from "@/lib/api";
import { loadAuthSession } from "@/lib/auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

type BackendQuiz = {
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
};

type BackendQuizSubmission = {
  id: string;
  quizId: string;
  studentId: string;
  submittedAt: string;
  answers: { questionId: string; selectedOptionId: string }[];
  score: number;
  total: number;
  checked: boolean;
  teacherFeedback?: string;
};

export type TeacherQuizSubmission = {
  id: string;
  quizId: string;
  studentId: number;
  studentBackendId?: string;
  submittedAt: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  subject?: string;
  teacherName?: string;
  checked: boolean;
  teacherFeedback?: string;
};

const toNumber = (value: string, fallback: number) => {
  const parsed = Number(value.replace(/[^0-9]/g, ""));
  return Number.isInteger(parsed) &&
    parsed > 0 &&
    parsed <= Number.MAX_SAFE_INTEGER
    ? parsed
    : fallback;
};

const mapQuiz = (quiz: BackendQuiz, index: number): MockTeacherQuiz => ({
  id: quiz.id,
  title: quiz.title,
  description: quiz.description ?? "",
  classGrade: quiz.classGrade,
  chapterName: quiz.chapterName ?? "",
  topicName: quiz.topicName ?? "",
  dueDate: quiz.dueDate,
  questions: quiz.questions.map((question) => ({
    id: question.id,
    text: question.text,
    options: question.options,
    correctOptionId: question.correctOptionId,
  })),
  teacherName: quiz.teacherName,
  teacherId: toNumber(quiz.teacherId, index + 1),
  subject: quiz.subject,
});

const mapSubmission = (
  submission: BackendQuizSubmission,
  index: number,
): TeacherQuizSubmission => ({
  id: submission.id,
  quizId: submission.quizId,
  studentId: toNumber(submission.studentId, index + 1),
  studentBackendId: submission.studentId,
  submittedAt: submission.submittedAt,
  answers: Object.fromEntries(
    submission.answers.map((answer) => [
      answer.questionId,
      answer.selectedOptionId,
    ]),
  ),
  score: submission.score,
  total: submission.total,
  checked: submission.checked,
  teacherFeedback: submission.teacherFeedback,
});

export const useTeacherQuizzes = ({
  teacherId,
  teacherBackendId,
  teacherSubject,
}: {
  teacherId: number;
  teacherBackendId?: string;
  teacherSubject: string;
}) => {
  const queryClient = useQueryClient();

  const { data: quizData, isLoading } = useQuery({
    queryKey: ["teacher-quizzes", teacherId, teacherBackendId, teacherSubject],
    queryFn: async () => {
      const authTeacherId = loadAuthSession()?.user.id ?? "";
      const quizQuery = teacherBackendId
        ? authTeacherId
          ? `/quizzes?teacherId=${encodeURIComponent(authTeacherId)}`
          : `/quizzes?teacherId=${encodeURIComponent(teacherBackendId)}`
        : `/quizzes?subject=${encodeURIComponent(teacherSubject)}`;

      const quizList = await apiAuthRequest<BackendQuiz[]>(quizQuery);
      const nextQuizzes = quizList.map(mapQuiz);

      const submissionQuery = authTeacherId
        ? `/quizzes/submissions/list?teacherId=${encodeURIComponent(authTeacherId)}`
        : teacherBackendId
        ? `/quizzes/submissions/list?teacherId=${encodeURIComponent(teacherBackendId)}`
        : "/quizzes/submissions/list";

      const submissionList =
        await apiAuthRequest<BackendQuizSubmission[]>(submissionQuery);
      const quizIds = new Set(nextQuizzes.map((quiz) => quiz.id));
      const filtered = submissionList.filter((submission) =>
        quizIds.has(submission.quizId),
      );

      return {
        quizzes: nextQuizzes,
        submissions: filtered.map(mapSubmission),
      };
    },
  });

  const quizzes = quizData?.quizzes ?? [];
  const submissions = quizData?.submissions ?? [];

  const createQuizMutation = useMutation({
    mutationFn: async (quiz: Omit<MockTeacherQuiz, "id">) => {
      const payload = {
        title: quiz.title,
        description: quiz.description,
        classGrade: quiz.classGrade,
        chapterName: quiz.chapterName,
        topicName: quiz.topicName,
        dueDate: quiz.dueDate,
        subject: quiz.subject ?? teacherSubject,
        questions: quiz.questions.map((question) => ({
          id: question.id,
          text: question.text,
          options: question.options,
          correctOptionId: question.correctOptionId ?? "",
        })),
      };

      return apiAuthRequest<BackendQuiz>("/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-quizzes", teacherId],
      });
    },
  });

  const reviewSubmissionMutation = useMutation({
    mutationFn: async ({
      submissionId,
      score,
      feedback,
    }: {
      submissionId: string;
      score: number;
      feedback?: string;
    }) => {
      return apiAuthRequest<BackendQuizSubmission>(
        `/quizzes/submissions/${submissionId}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            score,
            checked: true,
            teacherFeedback: feedback,
          }),
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["teacher-quizzes", teacherId],
      });
    },
  });

  const pendingCount = useMemo(
    () => submissions.filter((submission) => !submission.checked).length,
    [submissions],
  );

  return {
    quizzes,
    submissions,
    pendingCount,
    isLoading,
    createQuiz: createQuizMutation.mutateAsync,
    reviewSubmission: (
      submissionId: string,
      score: number,
      feedback?: string,
    ) => reviewSubmissionMutation.mutateAsync({ submissionId, score, feedback }),
  };
};
