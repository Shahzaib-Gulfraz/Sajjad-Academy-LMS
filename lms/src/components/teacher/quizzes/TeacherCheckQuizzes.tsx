import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardCheck, Clock, User } from "lucide-react";
import type { Student, Teacher } from "@/types/domain";
import { useTeacherQuizzes } from "@/hooks/use-teacher-quizzes";

type Option = {
  id: string;
  text: string;
};

type Question = {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string | null;
};

type TeacherQuiz = {
  id: string;
  title: string;
  description: string;
  classGrade: string;
  chapterName: string;
  topicName: string;
  dueDate: string;
  questions: Question[];
  teacherName?: string;
  teacherId?: number;
  subject?: string;
  createdAt?: string;
};

type QuizSubmission = {
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

type Props = {
  teacher: Teacher;
  students?: Student[];
};

const TeacherCheckQuizzes = ({ teacher, students = [] }: Props) => {
  const { quizzes, submissions, reviewSubmission, isLoading } = useTeacherQuizzes({
    teacherId: teacher.id,
    teacherBackendId: teacher.backendId,
    teacherSubject: teacher.subject,
  });
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState<string>("");
  const [feedbackInput, setFeedbackInput] = useState<string>("");

  useEffect(() => {
    if (quizzes.length > 0) {
      setActiveQuizId((prev) => prev ?? quizzes[0].id);
    }
  }, [quizzes]);

  const studentsById = useMemo(() => {
    const map = new Map<number, Student>();
    students.forEach((s) => map.set(s.id, s));
    return map;
  }, [students]);

  const studentsByBackendId = useMemo(() => {
    const map = new Map<string, Student>();
    students.forEach((student) => {
      if (student.backendId) {
        map.set(student.backendId, student);
      }
    });
    return map;
  }, [students]);

  const selectedQuiz = useMemo(
    () => quizzes.find((q) => q.id === activeQuizId) || null,
    [quizzes, activeQuizId]
  );

  const quizSubmissions = useMemo(() => {
    if (!selectedQuiz) return [];
    return submissions
      .filter((s) => s.quizId === selectedQuiz.id)
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }, [selectedQuiz, submissions]);

  const activeSubmission = useMemo(
    () => submissions.find((s) => s.id === activeSubmissionId) || null,
    [submissions, activeSubmissionId]
  );

  const pendingCount = useMemo(
    () => submissions.filter((s) => !s.checked).length,
    [submissions]
  );

  useEffect(() => {
    if (!activeSubmission) {
      setScoreInput("");
      setFeedbackInput("");
      return;
    }
    setScoreInput(String(activeSubmission.score));
    setFeedbackInput(activeSubmission.teacherFeedback || "");
  }, [activeSubmission]);

  const handleSaveReview = async () => {
    if (!activeSubmission || !selectedQuiz) return;
    const total = activeSubmission.total;
    const parsedScore = Number(scoreInput);
    if (Number.isNaN(parsedScore) || parsedScore < 0 || parsedScore > total) {
      return;
    }
    await reviewSubmission(
      activeSubmission.id,
      parsedScore,
      feedbackInput.trim() || undefined,
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Check Quizzes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review student submissions, mark them checked, and leave feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <ClipboardCheck className="h-4 w-4" /> My Quizzes
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{quizzes.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <User className="h-4 w-4" /> Submissions
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{submissions.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Clock className="h-4 w-4" /> Pending Check
          </div>
          <p className="text-2xl font-bold text-foreground mt-2">{pendingCount}</p>
        </div>
      </div>

      {isLoading && (
        <div className="mb-4 rounded-lg border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          Loading quizzes and submissions...
        </div>
      )}

      {quizzes.length === 0 && !isLoading && (
        <div className="rounded-xl border border-dashed border-border bg-card p-6 text-sm text-muted-foreground">
          No quizzes found yet. Create your first quiz from the "Create Quiz" section, then return
          here to review submissions.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">My Quizzes</h3>
            {quizzes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No quizzes created yet.</p>
            ) : (
              <div className="space-y-2">
                {quizzes.map((quiz) => {
                  const count = submissions.filter((s) => s.quizId === quiz.id).length;
                  const pending = submissions.filter(
                    (s) => s.quizId === quiz.id && !s.checked
                  ).length;
                  return (
                    <button
                      key={quiz.id}
                      onClick={() => {
                        setActiveQuizId(quiz.id);
                        setActiveSubmissionId(null);
                      }}
                      className={`w-full text-left rounded-lg border p-3 transition-colors ${
                        quiz.id === activeQuizId
                          ? "border-primary/60 bg-primary/5"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{quiz.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {quiz.classGrade} · {quiz.chapterName} · {quiz.topicName}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {count} submissions · {pending} pending
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!selectedQuiz && (
            <div className="rounded-xl border border-dashed border-border bg-card p-6 text-center text-sm text-muted-foreground">
              Select a quiz to review submissions.
            </div>
          )}

          {selectedQuiz && (
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">
                    {selectedQuiz.title}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {selectedQuiz.classGrade} · {selectedQuiz.chapterName} ·{" "}
                    {selectedQuiz.topicName} · Due {selectedQuiz.dueDate}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {quizSubmissions.length} submissions
                </span>
              </div>

              {quizSubmissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No submissions yet. Share the quiz with students and check back here once they
                  submit.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {quizSubmissions.map((sub) => {
                    const student =
                      studentsById.get(sub.studentId) ||
                      (sub.studentBackendId
                        ? studentsByBackendId.get(sub.studentBackendId)
                        : undefined);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => setActiveSubmissionId(sub.id)}
                        className={`w-full text-left rounded-lg border p-3 transition-colors ${
                          sub.id === activeSubmissionId
                            ? "border-primary/60 bg-primary/5"
                            : "border-border bg-background hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {student?.name || `Student #${sub.studentId}`}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted{" "}
                              {new Date(sub.submittedAt).toLocaleDateString("en-PK", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                              {sub.score}/{sub.total}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {sub.checked ? "Checked" : "Pending"}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSubmission && selectedQuiz && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-lg font-semibold text-foreground">Submission Review</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {studentsById.get(activeSubmission.studentId)?.name ||
                      (activeSubmission.studentBackendId
                        ? studentsByBackendId.get(activeSubmission.studentBackendId)?.name
                        : undefined) ||
                      `Student #${activeSubmission.studentId}`}
                    {" · "}
                    {activeSubmission.score}/{activeSubmission.total}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submitted{" "}
                    {new Date(activeSubmission.submittedAt).toLocaleString("en-PK")}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    activeSubmission.checked
                      ? "bg-success/10 text-success"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {activeSubmission.checked ? "Checked" : "Pending"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 rounded-lg border border-border p-4 bg-background">
                  <label className="text-xs text-muted-foreground block mb-1">Score</label>
                  <input
                    type="number"
                    min={0}
                    max={activeSubmission.total}
                    value={scoreInput}
                    onChange={(e) => setScoreInput(e.target.value)}
                    className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                  />
                  <label className="text-xs text-muted-foreground block mt-3 mb-1">
                    Feedback (optional)
                  </label>
                  <textarea
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    rows={3}
                    className="w-full rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                    placeholder="Add feedback for the student"
                  />
                  <button
                    onClick={handleSaveReview}
                    className="mt-3 w-full rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    Save Review
                  </button>
                </div>

                <div className="md:col-span-2 space-y-4">
                  {selectedQuiz.questions.map((q, index) => {
                    const selected = activeSubmission.answers[q.id];
                    return (
                      <div key={q.id} className="rounded-lg border border-border bg-background p-4">
                        <p className="font-medium text-foreground">
                          {index + 1}. {q.text}
                        </p>
                        <div className="mt-3 space-y-2">
                          {q.options.map((opt) => {
                            const isCorrect = opt.id === q.correctOptionId;
                            const isPicked = opt.id === selected;
                            const wrongPicked = isPicked && !isCorrect;
                            return (
                              <div
                                key={opt.id}
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  isCorrect
                                    ? "border-success/50 bg-success/10 text-success"
                                    : wrongPicked
                                    ? "border-destructive/50 bg-destructive/10 text-destructive"
                                    : "border-border text-muted-foreground"
                                }`}
                              >
                                {opt.text}
                                {isCorrect && " (Correct)"}
                                {wrongPicked && " (Student choice)"}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherCheckQuizzes;
