import { createPortal } from "react-dom";
import type { RefObject } from "react";
import { X } from "lucide-react";
import type { Student } from "@/types/domain";
import type { AnnouncementFormState } from "../types";

interface Props {
  open: boolean;
  modalRef: RefObject<HTMLDivElement>;
  form: AnnouncementFormState;
  teacherClasses: string[];
  studentsInTeacherClasses: Student[];
  showPriority?: boolean;
  priority?: "low" | "medium" | "high";
  onPriorityChange?: (value: "low" | "medium" | "high") => void;
  onClose: () => void;
  onFormChange: (next: AnnouncementFormState) => void;
  onSubmit: () => void;
}

const CreateAnnouncementModal = ({
  open,
  modalRef,
  form,
  teacherClasses,
  studentsInTeacherClasses,
  showPriority = false,
  priority = "medium",
  onPriorityChange,
  onClose,
  onFormChange,
  onSubmit,
}: Props) => {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Create Announcement</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => onFormChange({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              placeholder="Announcement title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => onFormChange({ ...form, content: e.target.value })}
              rows={4}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm resize-none"
              placeholder="Write your announcement..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Target Audience
            </label>
            <select
              value={form.targetType}
              onChange={(e) =>
                onFormChange({
                  ...form,
                  targetType: e.target.value as "all" | "classes" | "students",
                  selectedClasses: [],
                  selectedStudents: [],
                })
              }
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Students (in my classes)</option>
              <option value="classes">Specific Classes</option>
              <option value="students">Specific Students</option>
            </select>
          </div>

          {form.targetType === "classes" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Classes
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                {teacherClasses.map((cls) => (
                  <label key={cls} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selectedClasses.includes(cls)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFormChange({
                            ...form,
                            selectedClasses: [...form.selectedClasses, cls],
                          });
                        } else {
                          onFormChange({
                            ...form,
                            selectedClasses: form.selectedClasses.filter((c) => c !== cls),
                          });
                        }
                      }}
                    />
                    {cls}
                  </label>
                ))}
              </div>
            </div>
          )}

          {form.targetType === "students" && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Students
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto border border-border rounded-lg p-2">
                {studentsInTeacherClasses.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={form.selectedStudents.includes(student.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onFormChange({
                            ...form,
                            selectedStudents: [...form.selectedStudents, student.id],
                          });
                        } else {
                          onFormChange({
                            ...form,
                            selectedStudents: form.selectedStudents.filter(
                              (id) => id !== student.id
                            ),
                          });
                        }
                      }}
                    />
                    {student.name} ({student.grade})
                  </label>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={onSubmit}
            className="w-full bg-primary text-primary-foreground py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Send Announcement
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default CreateAnnouncementModal;
