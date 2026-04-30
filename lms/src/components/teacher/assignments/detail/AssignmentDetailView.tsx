import { ArrowLeft, Save, Eye } from "lucide-react";
import type { TeacherAssignment } from "@/types/domain";

interface Props {
  selectedAssignment: TeacherAssignment & {
    submissions: (TeacherAssignment["submissions"][number] & {
      fileUrl?: string;
    })[];
  };
  gradingStudent: number | null;
  gradingMarks: string;
  gradingFeedback: string;
  onBack: () => void;
  onSaveMarks: () => void;
  onSetGradingStudent: (studentId: number | null) => void;
  onSetGradingMarks: (value: string) => void;
  onSetGradingFeedback: (value: string) => void;
  statusColor: (s: string) => string;
  statusIcon: (s: string) => JSX.Element;
  allTeacherClasses?: { id: string; name: string }[];
}

const AssignmentDetailView = ({
  selectedAssignment,
  gradingStudent,
  gradingMarks,
  gradingFeedback,
  onBack,
  onSaveMarks,
  onSetGradingStudent,
  onSetGradingMarks,
  onSetGradingFeedback,
  statusColor,
  statusIcon,
  allTeacherClasses = [],
}: Props) => {
  const getClassName = (clsId: string) => {
    const classObj = allTeacherClasses.find((c) => c.id === clsId);
    return classObj ? classObj.name : clsId;
  };
  const submitted = selectedAssignment.submissions.filter(
    (s) => s.status === "Submitted" || s.status === "Late",
  );
  const graded = selectedAssignment.submissions.filter((s) => s.marks !== undefined);

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-primary text-sm hover:underline mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Assignments
      </button>

      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <h1 className="text-xl font-bold text-foreground">{selectedAssignment.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {selectedAssignment.subject} · Class {getClassName(selectedAssignment.classGrade)}
        </p>
        <p className="text-sm text-muted-foreground mt-2">{selectedAssignment.description}</p>

        <div className="flex flex-wrap gap-3 mt-4">
          <span className="text-xs px-2.5 py-1 rounded-full bg-info/15 text-info">
            Due: {selectedAssignment.dueDate}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-primary/15 text-primary">
            Total: {selectedAssignment.totalMarks} marks
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-success/15 text-success">
            {submitted.length}/{selectedAssignment.submissions.length} submitted
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-warning/15 text-warning">
            {graded.length} graded
          </span>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-foreground mb-4">Student Submissions</h2>

      <div className="space-y-3">
        {selectedAssignment.submissions.map((sub) => (
          <div key={sub.studentId} className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
                  {sub.studentAvatar}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{sub.studentName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(
                        sub.status,
                      )}`}
                    >
                      {statusIcon(sub.status)} {sub.status}
                    </span>
                    {sub.submittedDate && (
                      <span className="text-xs text-muted-foreground">
                        Submitted: {sub.submittedDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(sub.fileUrl || sub.fileName) && (
                  sub.fileUrl ? (
                    <a
                      href={sub.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-info hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {sub.fileName ?? "View File"}
                    </a>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Eye className="h-3.5 w-3.5" />
                      {sub.fileName}
                    </span>
                  )
                )}

                {sub.marks !== undefined ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-success">
                      {sub.marks}/{selectedAssignment.totalMarks}
                    </span>
                    <button
                      onClick={() => {
                        onSetGradingStudent(sub.studentId);
                        onSetGradingMarks(String(sub.marks));
                        onSetGradingFeedback(sub.feedback || "");
                      }}
                      className="px-3 py-1.5 bg-primary/10 text-primary text-xs rounded-lg font-medium hover:bg-primary/20 transition-colors"
                    >
                      Recheck
                    </button>
                  </div>
                ) : sub.status === "Submitted" || sub.status === "Late" ? (
                  <button
                    onClick={() => {
                      onSetGradingStudent(sub.studentId);
                      onSetGradingMarks(sub.marks !== undefined ? String(sub.marks) : "");
                      onSetGradingFeedback(sub.feedback || "");
                    }}
                    className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-lg font-medium hover:bg-primary/90 transition-colors"
                  >
                    Grade
                  </button>
                ) : null}
              </div>
            </div>

            {gradingStudent === sub.studentId && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      Marks (out of {selectedAssignment.totalMarks})
                    </label>
                    <input
                      type="number"
                      value={gradingMarks}
                      onChange={(e) => onSetGradingMarks(e.target.value)}
                      min={0}
                      max={selectedAssignment.totalMarks}
                      className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="text-xs text-muted-foreground mb-1 block">Feedback</label>
                  <textarea
                    value={gradingFeedback}
                    onChange={(e) => onSetGradingFeedback(e.target.value)}
                    rows={2}
                    placeholder="Feedback..."
                    className="w-full text-sm bg-muted/50 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary resize-none"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onSaveMarks}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-success text-success-foreground text-xs rounded-lg font-medium hover:bg-success/90 transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" /> Save Marks
                  </button>
                  <button
                    onClick={() => onSetGradingStudent(null)}
                    className="px-4 py-1.5 bg-muted text-muted-foreground text-xs rounded-lg font-medium hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {sub.marks !== undefined && sub.feedback && gradingStudent !== sub.studentId && (
              <p className="mt-2 text-xs text-muted-foreground italic">
                Feedback: {sub.feedback}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default AssignmentDetailView;
