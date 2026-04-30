import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardList,
  Upload,
  ArrowLeft,
  FileText,
  Calendar,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  ChevronRight,
} from "lucide-react";
import type { PortalStudent } from "../../types";
import { toast } from "sonner";
import { apiAuthRequest, apiRequest, API_BASE_URL } from "@/lib/api";
import { loadAuthSession } from "@/lib/auth";

interface Props {
  student: PortalStudent;
}

type BackendAssignment = {
  id: string;
  title: string;
  subject: string;
  classGrade: string;
  dueDate: string;
  totalMarks: number;
  description?: string;
  instructions?: string;
};

type BackendSubmission = {
  id: string;
  assignmentId: string;
  studentId: string;
  submittedAt: string;
  status: string;
  files: Array<{ publicId: string; secureUrl: string; format?: string }>;
  marks?: number;
};

type AssignmentView = {
  id: string;
  title: string;
  subject: string;
  due: string;
  status: string;
  score: string;
  totalMarks: number;
  question?: string;
  chapterName?: string;
  chapterNumber?: number;
  submissionType?: "Handwritten" | "Word" | "PDF";
  instructions?: string;
  submissionId?: string;
  submittedFileName?: string;
  submittedFileUrl?: string;
};

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    Submitted: "bg-success/15 text-success",
    Pending: "bg-warning/15 text-warning",
    Late: "bg-warning/15 text-warning",
    Missing: "bg-destructive/15 text-destructive",
  };
  return map[s] || "bg-muted text-muted-foreground";
};

const statusIcon = (s: string) => {
  if (s === "Submitted") return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (s === "Late") return <AlertCircle className="h-3.5 w-3.5" />;
  return <Clock className="h-3.5 w-3.5" />;
};

// Helper to check if due date is past
const isOverdue = (dueDateStr: string): boolean => {
  const due = new Date(dueDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
};

const StudentAssignments = ({ student }: Props) => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [visibleCount, setVisibleCount] = useState(9);

  const mapToView = (
    assignment: BackendAssignment,
    submission?: BackendSubmission,
  ): AssignmentView => {
    const due = assignment.dueDate.slice(0, 10);
    const submittedLate = submission
      ? new Date(submission.submittedAt) > new Date(due)
      : false;

    const score =
      typeof submission?.marks === "number"
        ? `${submission.marks}/${assignment.totalMarks}`
        : "—";

    return {
      id: assignment.id,
      title: assignment.title,
      subject: assignment.subject,
      due,
      status: submission ? (submittedLate ? "Late" : "Submitted") : "Pending",
      score,
      totalMarks: assignment.totalMarks,
      question: assignment.description || "See instructions for task details.",
      chapterName: assignment.subject,
      chapterNumber: 1,
      submissionType: "PDF",
      instructions:
        assignment.instructions ||
        "Submit your solution as a PDF before the due date.",
      submissionId: submission?.id,
    };
  };

  const { data: assignments = [], isLoading: loading } = useQuery({
    queryKey: ['student-assignments', student.grade],
    queryFn: async () => {
      const [assignmentList, submissionList] = await Promise.all([
        apiAuthRequest<BackendAssignment[]>(
          `/assignments?classGrade=${encodeURIComponent(student.grade)}`,
        ),
        apiAuthRequest<BackendSubmission[]>(`/assignments/submissions/list`),
      ]);

      const submissionsByAssignment = new Map(
        submissionList.map((submission) => [submission.assignmentId, submission]),
      );
      return assignmentList.map((assignment) => {
        const submission = submissionsByAssignment.get(assignment.id);
        const view = mapToView(assignment, submission);
        if (submission?.files?.[0]) {
          const file = submission.files[0];
          view.submittedFileName = file.format
            ? `${assignment.title}.${file.format}`
            : (file.publicId || "submitted_file");
          view.submittedFileUrl = file.secureUrl;
        }
        return view;
      });
    }
  });

  const selected = selectedIdx !== null ? assignments[selectedIdx] : null;

  const handleFileSelect = () => {
    const file = fileRef.current?.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed!");
      return;
    }
    setSelectedFile(file);
    toast.info(`File "${file.name}" selected. Click submit to upload.`);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (idx: number) => {
    if (!selectedFile) {
      toast.error("Please select a file first.");
      return;
    }

    const assignment = assignments[idx];
    if (!assignment) return;

    const isLate = isOverdue(assignment.due);
    const newStatus = isLate ? "Late" : "Submitted";

    setUploading(true);
    try {
      // Step 1: Get Cloudinary signed upload params
      const sigResponse = await fetch(`${API_BASE_URL}/files/upload-signature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loadAuthSession("student")?.accessToken ?? ""}`,
        },
        body: JSON.stringify({
          folder: "student-assignments",
          resourceType: "raw",
          allowedFormats: ["pdf", "doc", "docx"],
        }),
      });

      if (!sigResponse.ok) throw new Error("Failed to get upload signature.");
      const sigData = (await sigResponse.json()) as {
        data: {
          signature: string;
          timestamp: number;
          cloudName: string;
          apiKey: string;
          folder: string;
        };
      };
      const { signature, timestamp, cloudName, apiKey, folder } = sigData.data;

      // Step 2: Upload directly to Cloudinary
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("resource_type", "raw");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/raw/upload`,
        { method: "POST", body: formData },
      );

      if (!uploadRes.ok) throw new Error("Upload to Cloudinary failed.");
      const uploadData = (await uploadRes.json()) as {
        secure_url: string;
        public_id: string;
      };

      // Step 3: Save submission to backend
      await apiAuthRequest<BackendSubmission>(
        `/assignments/${encodeURIComponent(assignment.id)}/submissions`,
        {
          method: "POST",
          body: JSON.stringify({
            studentId: student.id,
            files: [
              {
                publicId: uploadData.public_id,
                secureUrl: uploadData.secure_url,
                resourceType: "raw",
                format: "pdf",
              },
            ],
          }),
        },
      );

      queryClient.setQueryData<AssignmentView[]>(['student-assignments', student.grade], (old) => {
        if (!old) return old;
        const updated = [...old];
        updated[idx] = { 
          ...updated[idx], 
          status: newStatus,
          submittedFileName: selectedFile.name,
          submittedFileUrl: uploadData.secure_url
        };
        return updated;
      });

      toast.success(
        isLate
          ? "Assignment submitted late. Your teacher has been notified."
          : "Assignment submitted successfully!",
      );
      setSelectedFile(null);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to submit assignment.";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const clearSelectedFile = () => {
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  if (selected !== null && selectedIdx !== null) {
    const isLateSubmission = isOverdue(selected.due);
    const hasUploaded = selected.submittedFileName;

    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => {
            setSelectedIdx(null);
            setSelectedFile(null);
          }}
          className="group inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 mb-6 transition-all duration-200 hover:-translate-x-1"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Assignments
        </button>

        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">
          {/* Header */}
          <div className="bg-gradient-to-r from-primary/5 via-transparent to-transparent p-6 pb-4 border-b border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground">{selected.title}</h2>
                <p className="text-sm text-muted-foreground mt-1">{selected.subject}</p>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusBadge(
                  selected.status,
                )}`}
              >
                {statusIcon(selected.status)}
                {selected.status}
              </span>
            </div>
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 pb-2">
            {[
              { label: "Due Date", value: selected.due, icon: Calendar },
              { label: "Subject", value: selected.subject, icon: BookOpen },
              { label: "Score", value: selected.score, icon: FileText },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 border border-border/40"
              >
                <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Assignment Details */}
          <div className="border-t border-border/80 px-6 py-5">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
              <ClipboardList className="h-4 w-4 text-primary" /> Assignment Details
            </h3>
            <div className="space-y-4">
              <div className="rounded-xl bg-muted/20 p-4 border border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Chapter</p>
                <p className="text-sm font-medium text-foreground">
                  Chapter {selected.chapterNumber}: {selected.chapterName}
                </p>
              </div>
              <div className="rounded-xl bg-muted/20 p-4 border border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Question / Task</p>
                <p className="text-sm text-foreground">{selected.question}</p>
              </div>
              <div className="rounded-xl bg-muted/20 p-4 border border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Total Marks</p>
                <p className="text-sm font-semibold text-foreground">
                  {selected.totalMarks} Marks
                </p>
              </div>
              <div className="rounded-xl bg-muted/20 p-4 border border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Submission Type</p>
                <p className="text-sm font-medium text-foreground">
                  {selected.submissionType}
                </p>
              </div>
              <div className="rounded-xl bg-muted/20 p-4 border border-border/40">
                <p className="text-xs text-muted-foreground mb-1">Instructions</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {selected.instructions}
                </p>
              </div>
            </div>
          </div>

          {/* Upload & Submit Section */}
          {selected.status !== "Submitted" && selected.status !== "Late" ? (
            <div className="border-t border-border/80 p-6 bg-muted/10">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <Upload className="h-4 w-4 text-primary" /> Submit Assignment (PDF)
              </h3>

              <input
                ref={fileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleFileSelect}
              />

              {!selectedFile ? (
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                >
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3 group-hover:text-primary transition-colors" />
                  <p className="text-sm text-muted-foreground">
                    Click to select your PDF file
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only PDF files are accepted
                  </p>
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border/60 p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={clearSelectedFile}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  </div>

                  <button
                    onClick={() => handleSubmit(selectedIdx)}
                    disabled={uploading}
                    className={`w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed ${isLateSubmission
                        ? "bg-warning text-warning-foreground hover:bg-warning/90"
                        : "bg-primary text-primary-foreground hover:bg-primary/90"
                      }`}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner h-4 w-4" /> Uploading...
                      </>
                    ) : isLateSubmission ? (
                      <>
                        <AlertCircle className="h-4 w-4" />
                        Submit Late Assignment
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Submit Assignment
                      </>
                    )}
                  </button>
                </div>
              )}

              {isLateSubmission && !selectedFile && (
                <div className="mt-3 flex items-center gap-2 text-xs text-warning bg-warning/10 rounded-lg p-2">
                  <AlertCircle className="h-3.5 w-3.5" />
                  This assignment is overdue. Submissions will be marked as late.
                </div>
              )}
            </div>
          ) : (
            hasUploaded && (
              <div className="border-t border-border/80 p-6 bg-muted/10">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl bg-success/10 p-5">
                  <div className="flex items-center gap-3 text-sm text-success">
                    <CheckCircle2 className="h-6 w-6" />
                    <div>
                      <p className="font-semibold text-base">Assignment Submitted</p>
                      <p className="text-xs mt-0.5">File: {hasUploaded}</p>
                    </div>
                  </div>
                  {selected.submittedFileUrl && (
                    <a
                      href={selected.submittedFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-success-foreground bg-success hover:bg-success/90 rounded-lg transition-colors whitespace-nowrap"
                    >
                      <Download className="h-4 w-4" /> View Submission
                    </a>
                  )}
                </div>
                {selected.status === "Late" && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-warning bg-warning/10 rounded-lg p-3 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    This assignment was submitted after the due date.
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    );
  }

  // Main list view
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="section-header mb-8 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
          <ClipboardList className="h-6 w-6 text-primary" /> Assignments
        </h1>
        <p className="text-muted-foreground mt-2">
          Submit your work and track your progress
        </p>
      </div>

      {loading && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground flex items-center gap-2 mb-6">
          <span className="spinner h-4 w-4" /> Loading assignments...
        </div>
      )}

      {assignments.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-16 px-4 rounded-2xl border border-dashed border-border bg-card/30">
          <div className="rounded-full bg-primary/10 p-4 mb-4">
            <ClipboardList className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No assignments yet</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm text-center">
            When your teachers post assignments, they will appear here.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {assignments.slice(0, visibleCount).map((a, i) => {
          const isOverdueAssignment = isOverdue(a.due) && a.status === "Pending";
          return (
            <button
              key={i}
              onClick={() => setSelectedIdx(i)}
              className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 text-left focus-visible:ring-2 focus-visible:ring-primary/30"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:shadow-sm transition-all">
                    <ClipboardList className="h-5 w-5 text-primary" />
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusBadge(
                      a.status,
                    )}`}
                  >
                    {statusIcon(a.status)}
                    {a.status}
                  </span>
                </div>
                <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-1">
                  {a.title}
                </h3>
                <p className="text-xs text-muted-foreground mb-3">{a.subject}</p>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className={isOverdueAssignment ? "text-destructive font-medium" : ""}>
                      Due: {a.due}
                    </span>
                  </div>
                  <span className="font-medium text-foreground">{a.score}</span>
                </div>
                {a.submittedFileName && (
                  <div className="mt-3 text-xs text-success flex items-center gap-1 bg-success/5 rounded-lg px-2 py-1">
                    <FileText className="h-3 w-3" /> {a.submittedFileName}
                  </div>
                )}
                {isOverdueAssignment && !a.submittedFileName && (
                  <div className="mt-3 text-xs text-warning flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Overdue
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {assignments.length > visibleCount && (
        <div className="mt-8 text-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 9)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/30 transition-all hover:shadow-sm"
          >
            Show more assignments <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;