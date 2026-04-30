import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ClipboardCheck, Timer, BookOpen, ChevronRight, Award, FileQuestion } from "lucide-react";
import type { PortalStudent } from "../types";
import { cambridgeGradeColor, percentageToCambridgeGrade } from "@/lib/grades";
import { useStudentQuizzes } from "@/hooks/use-student-quizzes";

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
  submittedAt: string;
  answers: Record<string, string>;
  score: number;
  total: number;
  subject?: string;
  teacherName?: string;
  checked: boolean;
};

type Props = {
  student: PortalStudent;
};

const StudentQuizzes = ({ student }: Props) => {
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [reviewSubmissionId, setReviewSubmissionId] = useState<string | null>(null);
  const [visibleAvailable, setVisibleAvailable] = useState(6);
  const [visibleSubmissions, setVisibleSubmissions] = useState(6);

  // Fetch quizzes and manage submissions via backend
  const { quizzes, submissions, assignments, submitQuiz, isLoading } = useStudentQuizzes({
    studentId: student.id,
    studentGrade: student.grade,
  });

  const enrolledSubjects = useMemo(() => {
    return Array.from(new Set((quizzes || []).map((q) => q.subject).filter((s): s is string => Boolean(s))));
  }, [quizzes]);

  const filteredQuizzes = useMemo(() => {
    if (selectedSubject === "all") return quizzes || [];
    return (quizzes || []).filter((quiz) => quiz.subject === selectedSubject);
  }, [quizzes, selectedSubject]);

  useEffect(() => {
    setVisibleAvailable(6);
  }, [selectedSubject, quizzes.length]);

  useEffect(() => {
    setVisibleSubmissions(6);
  }, [submissions.length]);

  const submittedQuizIds = useMemo(
    () => new Set((submissions || []).map((sub) => sub.quizId)),
    [submissions]
  );

  const availableQuizzes = useMemo(
    () => filteredQuizzes.filter((quiz) => !submittedQuizIds.has(quiz.id)),
    [filteredQuizzes, submittedQuizIds]
  );

  const selectedQuiz = useMemo(
    () => filteredQuizzes.find((quiz) => quiz.id === activeQuizId) || null,
    [filteredQuizzes, activeQuizId]
  );

  const reviewSubmission = useMemo(
    () => (submissions || []).find((sub) => sub.id === reviewSubmissionId) || null,
    [submissions, reviewSubmissionId]
  );

  const reviewQuiz = useMemo(() => {
    if (!reviewSubmission) return null;
    return (quizzes || []).find((quiz) => quiz.id === reviewSubmission.quizId) || null;
  }, [reviewSubmission, quizzes]);

  const pastPerformances = useMemo(() => {
    const list = [];
    if (submissions && submissions.length > 0) {
      list.push(...submissions.map(s => ({
        id: s.id,
        type: "Quiz",
        subject: s.subject || "Subject",
        date: new Date(s.submittedAt).toLocaleDateString("en-PK", {
          year: "numeric", month: "short", day: "numeric",
        }),
        score: s.score || 0,
        total: s.total || 0,
        percentage: s.total > 0 ? Math.round((s.score / s.total) * 100) : 0,
        isQuiz: true,
      })));
    }
    if (assignments && assignments.length > 0) {
      list.push(...assignments.map(a => ({
        id: a.id,
        type: a.assessment || "Assignment",
        subject: a.subject || "Subject",
        date: "Graded",
        score: a.marks || 0,
        total: a.totalMarks || 0,
        percentage: a.totalMarks > 0 && a.marks !== null ? Math.round((a.marks / a.totalMarks) * 100) : 0,
        isQuiz: false,
      })));
    }
    return list;
  }, [submissions, assignments]);

  const summary = useMemo(() => {
    let totalScore = 0;
    let totalQuestions = 0;
    let submissionCount = 0;

    if (submissions && submissions.length > 0) {
      totalScore += submissions.reduce((sum, s) => sum + (s.score || 0), 0);
      totalQuestions += submissions.reduce((sum, s) => sum + (s.total || 0), 0);
      submissionCount += submissions.length;
    }

    if (assignments && assignments.length > 0) {
      for (const a of assignments) {
        if (a.marks !== null && a.totalMarks > 0) {
          totalScore += a.marks;
          totalQuestions += a.totalMarks;
          submissionCount += 1;
        }
      }
    }

    if (submissionCount === 0) {
      return { total: 0, avg: 0 };
    }

    const avg = totalQuestions > 0 ? Math.round((totalScore / totalQuestions) * 100) : 0;
    return { total: submissionCount, avg };
  }, [submissions, assignments]);

  const handleStartQuiz = (quiz: TeacherQuiz) => {
    setActiveQuizId(quiz.id);
    setAnswers({});
    setReviewSubmissionId(null);
  };

  const handleSubmitQuiz = async () => {
    if (!selectedQuiz) return;
    const total = selectedQuiz.questions.length;
    if (total === 0) {
      toast.error("This quiz has no questions.");
      return;
    }
    const answeredCount = selectedQuiz.questions.filter((q) => answers[q.id]).length;
    if (answeredCount < total) {
      toast.error("Answer all questions before submitting.");
      return;
    }

    // Submit via backend hook
    const submission = await submitQuiz(selectedQuiz.id, answers);

    if (submission) {
      setActiveQuizId(null);
      setAnswers({});
      setReviewSubmissionId(submission.id);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="text-center sm:text-left">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center justify-center sm:justify-start gap-2">
          <FileQuestion className="h-7 w-7 text-primary" /> Quizzes
        </h1>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Attempt quizzes created by your teachers, track your performance, and review your answers.
        </p>
        {isLoading && (
          <div className="mt-3 rounded-xl border border-border/60 bg-card/50 p-3 text-sm text-muted-foreground flex items-center gap-2">
            <span className="spinner h-4 w-4" /> Loading quizzes...
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center">
              <ClipboardCheck className="h-5 w-5 text-primary" />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">Available Quizzes</p>
          <p className="text-3xl font-bold text-foreground mt-1">{availableQuizzes.length}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-11 w-11 rounded-xl bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5 text-success" />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">Completed</p>
          <p className="text-3xl font-bold text-foreground mt-1">{summary.total}</p>
        </div>

        <div className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-11 w-11 rounded-xl bg-warning/10 flex items-center justify-center">
              <Timer className="h-5 w-5 text-warning" />
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <p className="text-sm text-muted-foreground">Average Score</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className="text-3xl font-bold text-foreground">{summary.avg}%</p>
            {summary.total > 0 && (
              <span className={`text-sm font-semibold ${cambridgeGradeColor(percentageToCambridgeGrade(summary.avg))}`}>
                {percentageToCambridgeGrade(summary.avg)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Subject Filter */}
      <div className="flex flex-wrap gap-2 pb-2 border-b border-border/60">
        <span className="text-xs font-medium text-muted-foreground self-center mr-1">Filter by:</span>
        <button
          onClick={() => setSelectedSubject("all")}
          className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${selectedSubject === "all"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
        >
          All Subjects
        </button>
        {enrolledSubjects.map((subject) => (
          <button
            key={subject}
            onClick={() => setSelectedSubject(subject)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition-all duration-200 ${selectedSubject === subject
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
          >
            {subject}
          </button>
        ))}
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Available Quizzes & Past Performance */}
        <div className="lg:col-span-1 space-y-6">
          {/* Available Quizzes Card */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" /> Available Quizzes
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {availableQuizzes.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <BookOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  No quizzes available
                </div>
              ) : (
                <>
                  {availableQuizzes.slice(0, visibleAvailable).map((quiz) => (
                    <button
                      key={quiz.id}
                      onClick={() => handleStartQuiz(quiz)}
                      className="w-full text-left rounded-xl border border-border/60 bg-background p-4 hover:border-primary/40 hover:shadow-sm transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-foreground text-sm line-clamp-1">
                            {quiz.title}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                              {quiz.subject || "Subject"}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                              {quiz.chapterName}
                            </span>
                            <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded">
                              {quiz.topicName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>Due: {quiz.dueDate}</span>
                            <span>{quiz.questions.length} questions</span>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </button>
                  ))}
                  {availableQuizzes.length > visibleAvailable && (
                    <button
                      onClick={() => setVisibleAvailable((prev) => prev + 6)}
                      className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Show more <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Past Performance Card */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Past Performance
              </h3>
            </div>
            <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
              {pastPerformances.length === 0 ? (
                <div className="text-center py-6 text-sm text-muted-foreground">
                  <Award className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  No submissions yet
                </div>
              ) : (
                <>
                  {pastPerformances.slice(0, visibleSubmissions).map((item) => {
                    const grade = percentageToCambridgeGrade(item.percentage);
                    return (
                      <div
                        key={item.id}
                        className="rounded-xl border border-border/60 bg-background p-4 transition-all hover:border-primary/30"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-foreground text-sm">
                              {item.subject}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {item.type} · {item.date}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-foreground">
                              {item.score}/{item.total}
                            </p>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                {item.percentage}%
                              </span>
                              <span className={`text-xs font-semibold ${cambridgeGradeColor(grade)}`}>
                                {grade}
                              </span>
                            </div>
                          </div>
                        </div>
                        {item.isQuiz && (
                          <button
                            onClick={() => {
                              setReviewSubmissionId(item.id);
                              setActiveQuizId(null);
                            }}
                            className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            Review Attempt <ChevronRight className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  {pastPerformances.length > visibleSubmissions && (
                    <button
                      onClick={() => setVisibleSubmissions((prev) => prev + 6)}
                      className="mt-2 text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Show more <ChevronRight className="h-3 w-3" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Quiz or Review */}
        <div className="lg:col-span-2">
          {!selectedQuiz && !reviewSubmission && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/30 p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">
                Select a quiz from the left panel to start, or review a past attempt.
              </p>
            </div>
          )}

          {selectedQuiz && (
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
                <h2 className="text-xl font-bold text-foreground">{selectedQuiz.title}</h2>
                {selectedQuiz.description && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedQuiz.description}</p>
                )}
                <div className="flex flex-wrap gap-3 mt-3 text-xs text-muted-foreground">
                  <span className="bg-muted/30 px-2 py-0.5 rounded">{selectedQuiz.subject || "Subject"}</span>
                  <span className="bg-muted/30 px-2 py-0.5 rounded">{selectedQuiz.chapterName}</span>
                  <span className="bg-muted/30 px-2 py-0.5 rounded">{selectedQuiz.topicName}</span>
                  <span className="bg-muted/30 px-2 py-0.5 rounded">Due {selectedQuiz.dueDate}</span>
                  <span className="bg-muted/30 px-2 py-0.5 rounded">{selectedQuiz.questions.length} questions</span>
                </div>
              </div>

              <div className="p-6 space-y-5 max-h-[500px] overflow-y-auto">
                {selectedQuiz.questions.map((q, index) => (
                  <div key={q.id} className="rounded-xl border border-border/60 bg-background p-5">
                    <p className="font-semibold text-foreground mb-3">
                      {index + 1}. {q.text}
                    </p>
                    <div className="space-y-2.5">
                      {q.options.map((opt) => (
                        <label
                          key={opt.id}
                          className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all ${answers[q.id] === opt.id
                              ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                              : "border-border hover:border-primary/40"
                            }`}
                        >
                          <input
                            type="radio"
                            name={`answer-${q.id}`}
                            checked={answers[q.id] === opt.id}
                            onChange={() =>
                              setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))
                            }
                            className="h-4 w-4 text-primary focus:ring-primary/20"
                          />
                          <span className="text-foreground">{opt.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-border/60 bg-muted/10">
                <button
                  onClick={() => setActiveQuizId(null)}
                  className="px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitQuiz}
                  className="px-6 py-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90 transition-all"
                >
                  Submit to Teacher
                </button>
              </div>
            </div>
          )}

          {reviewSubmission && reviewQuiz && (
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-border/60 bg-gradient-to-r from-primary/5 to-transparent">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">Review: {reviewQuiz.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {reviewSubmission.score}/{reviewSubmission.total} · Submitted{' '}
                      {new Date(reviewSubmission.submittedAt).toLocaleString("en-PK")}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${reviewSubmission.checked
                        ? "bg-success/10 text-success"
                        : "bg-warning/10 text-warning"
                      }`}
                  >
                    {reviewSubmission.checked ? "Graded" : "Pending Review"}
                  </span>
                </div>
              </div>

              <div className="p-6">
                {!reviewSubmission.checked ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Timer className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="text-foreground font-medium">Waiting for teacher's review</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your answers have been submitted. The teacher will check and grade them soon.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-5 max-h-[500px] overflow-y-auto">
                    {reviewQuiz.questions.map((q, index) => {
                      const selected = reviewSubmission.answers[q.id];
                      return (
                        <div key={q.id} className="rounded-xl border border-border/60 bg-background p-5">
                          <p className="font-semibold text-foreground mb-3">
                            {index + 1}. {q.text}
                          </p>
                          <div className="space-y-2.5">
                            {q.options.map((opt) => {
                              const isCorrect = opt.id === q.correctOptionId;
                              const isPicked = opt.id === selected;
                              const wrongPicked = isPicked && !isCorrect;
                              let className = "rounded-lg border px-4 py-2.5 text-sm ";
                              if (isCorrect) {
                                className += "border-success/50 bg-success/10 text-success";
                              } else if (wrongPicked) {
                                className += "border-destructive/50 bg-destructive/10 text-destructive";
                              } else {
                                className += "border-border text-muted-foreground";
                              }
                              return (
                                <div key={opt.id} className={className}>
                                  {opt.text}
                                  {isCorrect && " ✓ (Correct Answer)"}
                                  {wrongPicked && " ✗ (Your Selection)"}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentQuizzes;