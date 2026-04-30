import { useState } from "react";
import { toast } from "sonner";
import { Megaphone, Send, Users, BookOpen, UserCheck, Filter } from "lucide-react";
import type { Announcement, Student, AnnouncementTarget } from "@/types/domain";

type SentAnnouncement = {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  targetLabel: string;
};

type Props = {
  senderName: string;
  classes: string[];
  students: Student[];
  receivedAnnouncements: Announcement[];
  allStudentsLabel?: string;
  onAnnouncementCreated?: (
    announcement: Announcement,
    target: AnnouncementTarget,
  ) => void | Promise<unknown>;
  hideReceived?: boolean;
  lockTargetAll?: boolean;
};

const TeacherAnnouncements = ({
  senderName,
  classes,
  students,
  receivedAnnouncements,
  allStudentsLabel = "All Students (in my classes)",
  onAnnouncementCreated,
  hideReceived = false,
  lockTargetAll = false,
}: Props) => {
  const [sentAnnouncements, setSentAnnouncements] = useState<SentAnnouncement[]>([]);
  const [announceForm, setAnnounceForm] = useState({
    title: "",
    content: "",
    targetType: "all" as "all" | "classes" | "students",
    selectedClasses: [] as string[],
    selectedStudents: [] as number[],
    studentClassFilter: "all",
  });

  const filteredStudents =
    announceForm.studentClassFilter === "all"
      ? students
      : students.filter((s) => s.grade === announceForm.studentClassFilter);

  const handleCreateAnnouncement = async () => {
    if (!announceForm.title.trim() || !announceForm.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    let targetLabel = "";
    if (lockTargetAll || announceForm.targetType === "all") {
      targetLabel =
        classes.length > 0
          ? `All students in ${classes.join(", ")}`
          : "All students";
    } else if (announceForm.targetType === "classes") {
      if (announceForm.selectedClasses.length === 0) {
        toast.error("Select at least one class");
        return;
      }
      targetLabel = `Classes: ${announceForm.selectedClasses.join(", ")}`;
    } else {
      if (announceForm.selectedStudents.length === 0) {
        toast.error("Select at least one student");
        return;
      }
      const studentNames = students
        .filter((s) => announceForm.selectedStudents.includes(s.id))
        .map((s) => s.name)
        .join(", ");
      targetLabel = `Students: ${studentNames}`;
    }

    const newAnnouncement: SentAnnouncement = {
      id: Date.now().toString(),
      title: announceForm.title,
      content: announceForm.content,
      date: new Date().toISOString().split("T")[0],
      author: senderName,
      targetLabel,
    };

    const createdAnnouncement: Announcement = {
      id: Date.now(),
      title: announceForm.title,
      date: newAnnouncement.date,
      priority: "medium",
      content: announceForm.content,
      author: senderName,
    };

    const targetPayload: AnnouncementTarget = lockTargetAll
      ? {
          targetType: "all",
          targetClasses: [],
          targetStudentIds: [],
        }
      : {
          targetType: announceForm.targetType,
          targetClasses: announceForm.targetType === "classes" ? announceForm.selectedClasses : [],
          targetStudentIds:
            announceForm.targetType === "students" ? announceForm.selectedStudents : [],
        };

    try {
      await onAnnouncementCreated?.(createdAnnouncement, targetPayload);
      setSentAnnouncements((prev) => [newAnnouncement, ...prev]);
      toast.success(`Announcement sent to ${targetLabel}`);
    } catch {
      toast.error("Failed to send announcement");
      return;
    }

    setAnnounceForm({
      title: "",
      content: "",
      targetType: "all",
      selectedClasses: [],
      selectedStudents: [],
      studentClassFilter: "all",
    });
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Megaphone className="h-7 w-7 text-primary" /> Announcements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and manage announcements for your students.
          </p>
        </div>
      </div>

      {/* Two‑column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column: Send form */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
          <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
            <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Send className="h-5 w-5 text-primary" /> Send Announcement
            </h3>
          </div>
          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
              <input
                type="text"
                value={announceForm.title}
                onChange={(e) => setAnnounceForm({ ...announceForm, title: e.target.value })}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="e.g., Upcoming Test Reminder"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Content</label>
              <textarea
                value={announceForm.content}
                onChange={(e) => setAnnounceForm({ ...announceForm, content: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                placeholder="Write your announcement details here..."
              />
            </div>

            {!lockTargetAll && (
              <>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">
                    Target Audience
                  </label>
                  <select
                    value={announceForm.targetType}
                    onChange={(e) =>
                      setAnnounceForm({
                        ...announceForm,
                        targetType: e.target.value as "all" | "classes" | "students",
                        selectedClasses: [],
                        selectedStudents: [],
                        studentClassFilter: "all",
                      })
                    }
                    className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  >
                    <option value="all">{allStudentsLabel}</option>
                    <option value="classes">Specific Classes</option>
                    <option value="students">Specific Students</option>
                  </select>
                </div>

                {announceForm.targetType === "classes" && (
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-primary" /> Select Classes
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border border-border rounded-xl p-3 bg-muted/5 scrollbar-thin">
                      {classes.map((cls) => (
                        <label key={cls} className="flex items-center gap-3 text-sm cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={announceForm.selectedClasses.includes(cls)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setAnnounceForm({
                                  ...announceForm,
                                  selectedClasses: [...announceForm.selectedClasses, cls],
                                });
                              } else {
                                setAnnounceForm({
                                  ...announceForm,
                                  selectedClasses: announceForm.selectedClasses.filter((c) => c !== cls),
                                });
                              }
                            }}
                            className="rounded border-primary/30 text-primary focus:ring-primary/20 h-4 w-4"
                          />
                          <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                            {cls}
                          </span>
                        </label>
                      ))}
                      {classes.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-2">No classes available.</p>
                      )}
                    </div>
                  </div>
                )}

                {announceForm.targetType === "students" && (
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground mb-1.5 flex items-center gap-2">
                        <Filter className="h-4 w-4 text-primary" /> Class Filter
                      </label>
                      <select
                        value={announceForm.studentClassFilter}
                        onChange={(e) =>
                          setAnnounceForm({ ...announceForm, studentClassFilter: e.target.value })
                        }
                        className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      >
                        <option value="all">All Classes</option>
                        {classes.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" /> Select Students
                      </label>
                      <div className="space-y-2 max-h-52 overflow-y-auto border border-border rounded-xl p-3 bg-muted/5 scrollbar-thin">
                        {filteredStudents.map((student) => (
                          <label key={student.id} className="flex items-center gap-3 text-sm cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={announceForm.selectedStudents.includes(student.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setAnnounceForm({
                                    ...announceForm,
                                    selectedStudents: [...announceForm.selectedStudents, student.id],
                                  });
                                } else {
                                  setAnnounceForm({
                                    ...announceForm,
                                    selectedStudents: announceForm.selectedStudents.filter(
                                      (id) => id !== student.id
                                    ),
                                  });
                                }
                              }}
                              className="rounded border-primary/30 text-primary focus:ring-primary/20 h-4 w-4"
                            />
                            <span className="text-foreground group-hover:text-primary transition-colors">
                              {student.name} <span className="text-muted-foreground text-xs">({student.grade})</span>
                            </span>
                          </label>
                        ))}
                        {filteredStudents.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            No students in this class.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <button
              onClick={handleCreateAnnouncement}
              className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" /> Send Announcement
            </button>
          </div>
        </div>

        {/* Right column: Sent & Received announcements */}
        <div className="space-y-6">
          {/* Sent announcements */}
          <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
            <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-primary" /> Sent Announcements
              </h3>
            </div>
            <div className="p-5 max-h-[400px] overflow-y-auto scrollbar-thin">
              {sentAnnouncements.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                    <Megaphone className="h-6 w-6 text-muted-foreground/40" />
                  </div>
                  <p className="text-sm text-muted-foreground">No sent announcements yet.</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Use the form to create your first announcement.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sentAnnouncements.map((a) => (
                    <div
                      key={a.id}
                      className="group p-4 rounded-xl border border-border/60 bg-muted/5 hover:border-primary/30 hover:shadow-sm transition-all hover:-translate-y-0.5"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-2.5 w-2.5 rounded-full bg-success mt-1.5 shrink-0 ring-1 ring-success/20" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-foreground text-sm line-clamp-1">{a.title}</h4>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {a.content}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{a.date}</span>
                            <span>•</span>
                            <span>{a.author}</span>
                            <span>•</span>
                            <span className="text-success/80 font-medium">{a.targetLabel}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Received announcements (if not hidden) */}
          {!hideReceived && (
            <div className="rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
              <div className="px-6 py-4 border-b border-border/60 bg-muted/10">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" /> Received Announcements
                </h3>
              </div>
              <div className="p-5 max-h-[400px] overflow-y-auto scrollbar-thin">
                {receivedAnnouncements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="h-12 w-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                      <Users className="h-6 w-6 text-muted-foreground/40" />
                    </div>
                    <p className="text-sm text-muted-foreground">No received announcements yet.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {receivedAnnouncements.map((a) => (
                      <div
                        key={a.id}
                        className="group p-4 rounded-xl border border-border/60 bg-muted/5 hover:border-primary/30 hover:shadow-sm transition-all hover:-translate-y-0.5"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`h-2.5 w-2.5 rounded-full mt-1.5 shrink-0 ring-1 ${
                              a.priority === "high"
                                ? "bg-destructive ring-destructive/20"
                                : a.priority === "medium"
                                ? "bg-warning ring-warning/20"
                                : "bg-muted-foreground ring-muted-foreground/20"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-sm line-clamp-1">{a.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {a.content}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-muted-foreground">
                              <span>{a.date}</span>
                              <span>•</span>
                              <span>{a.author}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
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

export default TeacherAnnouncements;