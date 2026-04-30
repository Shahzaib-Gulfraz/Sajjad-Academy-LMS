import { useMemo, useState } from "react";
import { PlusCircle, Trash2, X, Save } from "lucide-react";
import type { Teacher } from "@/types/domain";
import { toast } from "sonner";
import { useTeacherQuizzes } from "@/hooks/use-teacher-quizzes";
import type { BackendCourse } from "@/hooks/use-teacher-data";

// Types
interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  text: string;
  options: Option[];
  correctOptionId: string | null;
}

interface Quiz {
  id?: string;
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
}

const MAX_QUESTIONS = 20;
const MAX_OPTIONS = 5;

interface Props {
  teacher: Teacher;
  classNameMap?: Record<string, string>;
  backendCourses?: BackendCourse[];
}

const TeacherCreateQuiz = ({
  teacher,
  classNameMap = {},
  backendCourses = [],
}: Props) => {
  const { createQuiz, isLoading: hookLoading } = useTeacherQuizzes({
    teacherId: teacher.id,
    teacherBackendId: teacher.backendId,
    teacherSubject: teacher.subject,
  });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [quiz, setQuiz] = useState<Quiz>({
    title: "",
    description: "",
    classGrade: "",
    chapterName: "",
    topicName: "",
    dueDate: "",
    questions: [],
  });

  const selectedClassName = useMemo(
    () => classNameMap[quiz.classGrade] || quiz.classGrade,
    [classNameMap, quiz.classGrade],
  );

  const matchingCourse = useMemo(() => {
    if (!selectedClassName) return null;

    return (
      backendCourses.find(
        (course) =>
          course.grade === selectedClassName ||
          course.grade === quiz.classGrade ||
          course.name === selectedClassName,
      ) ?? null
    );
  }, [backendCourses, quiz.classGrade, selectedClassName]);

  const chapters = matchingCourse?.chapters ?? [];
  const selectedChapter = chapters.find((chapter) => chapter.chapterName === quiz.chapterName);
  const topics = selectedChapter?.topics ?? [];

  const addQuestion = () => {
    if (quiz.questions.length >= MAX_QUESTIONS) {
      toast.error(`You can only add up to ${MAX_QUESTIONS} questions.`);
      return;
    }
    const newQuestion: Question = {
      id: Date.now().toString() + Math.random(),
      text: "",
      options: [
        { id: `opt-${Date.now()}-1`, text: "" },
        { id: `opt-${Date.now()}-2`, text: "" },
      ],
      correctOptionId: null,
    };
    setQuiz({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const removeQuestion = (qId: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.filter((q) => q.id !== qId),
    });
  };

  const updateQuestionText = (qId: string, text: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === qId ? { ...q, text } : q
      ),
    });
  };

  const addOption = (qId: string) => {
    const question = quiz.questions.find((q) => q.id === qId);
    if (!question) return;
    if (question.options.length >= MAX_OPTIONS) {
      toast.error(`You can only add up to ${MAX_OPTIONS} options.`);
      return;
    }
    const newOption: Option = {
      id: `opt-${Date.now()}-${Math.random()}`,
      text: "",
    };
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === qId ? { ...q, options: [...q.options, newOption] } : q
      ),
    });
  };

  const removeOption = (qId: string, optId: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.filter((o) => o.id !== optId),
              correctOptionId: q.correctOptionId === optId ? null : q.correctOptionId,
            }
          : q
      ),
    });
  };

  const updateOptionText = (qId: string, optId: string, text: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === qId
          ? {
              ...q,
              options: q.options.map((o) => (o.id === optId ? { ...o, text } : o)),
            }
          : q
      ),
    });
  };

  const setCorrectOption = (qId: string, optId: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === qId ? { ...q, correctOptionId: optId } : q
      ),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validate
    if (!quiz.title.trim()) {
      toast.error("Please enter a quiz title.");
      return;
    }
    if (!quiz.classGrade.trim()) {
      toast.error("Please select a class.");
      return;
    }
    if (!quiz.chapterName.trim()) {
      toast.error("Please select a chapter.");
      return;
    }
    if (!quiz.topicName.trim()) {
      toast.error("Please select a topic.");
      return;
    }
    if (!quiz.dueDate) {
      toast.error("Please set a due date.");
      return;
    }
    for (const [idx, q] of quiz.questions.entries()) {
      if (!q.text.trim()) {
        toast.error(`Question ${idx + 1} text is empty.`);
        return;
      }
      for (const [optIdx, opt] of q.options.entries()) {
        if (!opt.text.trim()) {
          toast.error(`Question ${idx + 1}, Option ${optIdx + 1} text is empty.`);
          return;
        }
      }
      if (!q.correctOptionId) {
        toast.error(`Question ${idx + 1} does not have a correct answer selected.`);
        return;
      }
    }
    setIsSaving(true);
    try {
      await createQuiz({
        ...quiz,
        teacherName: teacher.name,
        teacherId: teacher.id,
        subject: teacher.subject,
        createdAt: new Date().toISOString(),
      });
      toast.success("Quiz created successfully!");
    } catch {
      toast.error("Failed to create quiz.");
      return;
    } finally {
      setIsSaving(false);
    }

    setQuiz({
      title: "",
      description: "",
      classGrade: "",
      chapterName: "",
      topicName: "",
      dueDate: "",
      questions: [],
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-fade-in">
      <div className="section-header mb-0">
        <div>
      <h1 className="section-title">Create New Quiz</h1>
      <p className="section-subtitle">
        {teacher.name} ({teacher.subject})
      </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Quiz metadata */}
        <div className="card card-elevated p-5 space-y-4">
          <div>
            <label htmlFor="title" className="input-label">
              Quiz Title <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              id="title"
              value={quiz.title}
              onChange={(e) => setQuiz({ ...quiz, title: e.target.value })}
              className="input-modern"
              placeholder="e.g., Algebra Mid-Term Quiz"
              required
            />
          </div>

          <div>
            <label htmlFor="desc" className="input-label">
              Description (optional)
            </label>
            <textarea
              id="desc"
              value={quiz.description}
              onChange={(e) => setQuiz({ ...quiz, description: e.target.value })}
              rows={2}
              className="input-modern"
              placeholder="Brief description of the quiz"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="class" className="input-label">
                Class/Grade <span className="text-destructive">*</span>
              </label>
              <select
                id="class"
                value={quiz.classGrade}
                onChange={(e) =>
                  setQuiz({
                    ...quiz,
                    classGrade: e.target.value,
                    chapterName: "",
                    topicName: "",
                  })
                }
                className="select-modern"
                required
              >
                <option value="">Select class</option>
                {teacher.classes.map((classId) => (
                  <option key={classId} value={classId}>
                    {classNameMap[classId] || classId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="dueDate" className="input-label">
                Due Date <span className="text-destructive">*</span>
              </label>
              <input
                type="date"
                id="dueDate"
                value={quiz.dueDate}
                onChange={(e) => setQuiz({ ...quiz, dueDate: e.target.value })}
                className="input-modern"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">
                Chapter <span className="text-destructive">*</span>
              </label>
              <select
                value={quiz.chapterName}
                onChange={(e) => setQuiz({ ...quiz, chapterName: e.target.value, topicName: "" })}
                className="select-modern"
                required
                disabled={!matchingCourse}
              >
                <option value="">{matchingCourse ? "Select chapter" : "Select class first"}</option>
                {chapters.map((chapter) => (
                  <option key={chapter.id || chapter.chapterName} value={chapter.chapterName}>
                    {chapter.chapterName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">
                Topic <span className="text-destructive">*</span>
              </label>
              <select
                value={quiz.topicName}
                onChange={(e) => setQuiz({ ...quiz, topicName: e.target.value })}
                className="select-modern"
                required
                disabled={!quiz.chapterName}
              >
                <option value="">{quiz.chapterName ? "Select topic" : "Select chapter first"}</option>
                {topics.map((topic) => (
                  <option key={topic.id || topic.topicName} value={topic.topicName}>
                    {topic.topicName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {matchingCourse && chapters.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              This class does not have chapters configured in the database yet.
            </p>
          ) : null}

          {matchingCourse && quiz.chapterName && topics.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              This chapter does not have sub topics configured in the database yet.
            </p>
          ) : null}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Questions ({quiz.questions.length}/{MAX_QUESTIONS})
            </h2>
            <button
              type="button"
              onClick={addQuestion}
              className="btn-primary btn-sm"
            >
              <PlusCircle className="h-4 w-4" /> Add Question
            </button>
          </div>

          {quiz.questions.length === 0 && (
            <p className="text-center text-muted-foreground py-8 border border-dashed border-border rounded-lg">
              No questions yet. Click "Add Question" to start.
            </p>
          )}

          {quiz.questions.map((q, qIdx) => (
            <div key={q.id} className="card card-elevated p-5">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-medium text-foreground">Question {qIdx + 1}</h3>
                <button
                  type="button"
                  onClick={() => removeQuestion(q.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove question"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <textarea
                value={q.text}
                onChange={(e) => updateQuestionText(q.id, e.target.value)}
                placeholder="Enter your question here..."
                rows={2}
                className="input-modern mb-4"
                required
              />

              <div className="space-y-3">
                {q.options.map((opt, optIdx) => (
                  <div key={opt.id} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <span className="w-full sm:w-24 shrink-0 text-xs font-medium text-muted-foreground">
                      Option {optIdx + 1}
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOptionText(q.id, opt.id, e.target.value)}
                      placeholder={`Option ${optIdx + 1}`}
                      className="input-modern flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setCorrectOption(q.id, opt.id)}
                      className={`btn-secondary btn-sm whitespace-nowrap ${
                        q.correctOptionId === opt.id ? "border-success text-success" : ""
                      }`}
                    >
                      {q.correctOptionId === opt.id ? "Correct" : "Mark correct"}
                    </button>
                    {q.options.length > 2 ? (
                      <button
                        type="button"
                        onClick={() => removeOption(q.id, opt.id)}
                        className="text-muted-foreground hover:text-destructive transition-colors"
                        title="Remove option"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              {q.options.length < MAX_OPTIONS && (
                <button
                  type="button"
                  onClick={() => addOption(q.id)}
                  className="btn-ghost btn-sm mt-3"
                >
                  <PlusCircle className="h-3 w-3" /> Add Option
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="btn-outline"
            >
              Preview Quiz
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Save className="h-4 w-4" /> {isSaving ? "Saving..." : "Save Quiz"}
            </button>
          </div>
        </div>
      </form>

      {previewOpen && (
        <div className="modal-overlay z-[60] p-4">
          <div className="modal max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Quiz Preview</h3>
              <button
                onClick={() => setPreviewOpen(false)}
                className="btn-ghost btn-icon text-muted-foreground hover:text-foreground"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <h4 className="text-xl font-semibold text-foreground">{quiz.title || "Untitled Quiz"}</h4>
                {quiz.description && (
                  <p className="text-sm text-muted-foreground mt-1">{quiz.description}</p>
                )}
                <div className="text-xs text-muted-foreground mt-2">
                  {classNameMap[quiz.classGrade] || quiz.classGrade || "Class not set"} · {quiz.chapterName || "Chapter not set"} ·{" "}
                  {quiz.topicName || "Topic not set"} · {quiz.dueDate || "Due date not set"}
                </div>
              </div>

              {quiz.questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No questions added yet.</p>
              ) : (
                <div className="space-y-4">
                  {quiz.questions.map((q, idx) => (
                    <div key={q.id} className="card p-4">
                      <p className="font-medium text-foreground">
                        {idx + 1}. {q.text || "Untitled question"}
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                        {q.options.map((opt) => (
                          <li key={opt.id} className={opt.id === q.correctOptionId ? "text-success" : ""}>
                            {opt.id === q.correctOptionId ? "✓ " : ""}{opt.text || "Untitled option"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherCreateQuiz;
