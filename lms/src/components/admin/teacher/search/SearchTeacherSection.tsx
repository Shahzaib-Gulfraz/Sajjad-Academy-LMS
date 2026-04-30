import { Pencil, Search, Trash2 } from "lucide-react";
import type { AdminTeacherRecord, ClassSubjectForm } from "../types";
import { teacherCode } from "../utils";
import ClassSubjectAssignment from "../shared/ClassSubjectAssignment";

type EditForm = ClassSubjectForm & {
  name: string;
  id: number;
  gender: string;
  qualification: string;
};

interface Props {
  query: string;
  onQueryChange: (value: string) => void;
  filteredTeachers: AdminTeacherRecord[];
  selectedTeacherId: number | null;
  onSelectTeacherId: (id: number) => void;
  selectedTeacher: AdminTeacherRecord | null;
  editingTeacherId: number | null;
  editForm: EditForm | null;
  onEditFormChange: (next: EditForm) => void;
  onStartEditing: (teacher: AdminTeacherRecord) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onDeleteTeacher: (teacher: AdminTeacherRecord) => void;
  classOptions: string[];
  subjectOptions: string[];
  classSubjectOptions: Record<string, string[]>;
  disableSave?: boolean;
  genderOptions: string[];
  onToggleClass: (className: string) => void;
  onToggleSubject: (className: string, subject: string) => void;
}

const SearchTeacherSection = ({
  query,
  onQueryChange,
  filteredTeachers,
  selectedTeacherId,
  onSelectTeacherId,
  selectedTeacher,
  editingTeacherId,
  editForm,
  onEditFormChange,
  onStartEditing,
  onCancelEdit,
  onSaveEdit,
  onDeleteTeacher,
  classOptions,
  subjectOptions,
  classSubjectOptions,
  disableSave = false,
  genderOptions,
  onToggleClass,
  onToggleSubject,
}: Props) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-1 rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by teacher name, ID, class or subject"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="max-h-[500px] overflow-auto">
          {filteredTeachers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teacher found.</p>
          ) : (
            <div className="space-y-2">
              {filteredTeachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => onSelectTeacherId(teacher.id)}
                  className={`w-full rounded-lg border px-3 py-2 text-left ${
                    selectedTeacherId === teacher.id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background"
                  }`}
                >
                  <p className="font-medium text-foreground">{teacher.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {teacherCode(teacher.id)} | {teacher.classes.join(", ")}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="xl:col-span-2 rounded-xl border border-border bg-card p-5">
        {!selectedTeacher ? (
          <p className="text-sm text-muted-foreground">Select a teacher to view full details.</p>
        ) : editingTeacherId === selectedTeacher.id && editForm ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Edit Teacher</h2>
              <button
                onClick={onCancelEdit}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                value={editForm.name}
                onChange={(e) => onEditFormChange({ ...editForm, name: e.target.value })}
                placeholder="Teacher Name"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <input
                value={editForm.id}
                onChange={(e) => onEditFormChange({ ...editForm, id: Number(e.target.value) || 0 })}
                placeholder="Teacher ID"
                type="number"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <select
                value={editForm.gender}
                onChange={(e) => onEditFormChange({ ...editForm, gender: e.target.value })}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {genderOptions.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
              <input
                value={editForm.qualification}
                onChange={(e) => onEditFormChange({ ...editForm, qualification: e.target.value })}
                placeholder="Qualification"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </div>

            <ClassSubjectAssignment
              form={editForm}
              classOptions={classOptions}
              subjectOptions={subjectOptions}
              classSubjectOptions={classSubjectOptions}
              onToggleClass={onToggleClass}
              onToggleSubject={onToggleSubject}
            />

            {disableSave && (
              <p className="text-xs text-muted-foreground">
                Configure courses for all selected classes before saving.
              </p>
            )}

            <button
              onClick={onSaveEdit}
              disabled={disableSave}
              className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
            >
              Save Changes
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{selectedTeacher.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {teacherCode(selectedTeacher.id)} | {selectedTeacher.email}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => onStartEditing(selectedTeacher)}
                  className="p-2 rounded-lg border border-border hover:bg-muted"
                  title="Edit Teacher"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDeleteTeacher(selectedTeacher)}
                  className="p-2 rounded-lg border border-border hover:bg-destructive/10 text-destructive"
                  title="Delete Teacher"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Gender</p>
                <p className="font-medium text-foreground">{selectedTeacher.gender || "N/A"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Qualification</p>
                <p className="font-medium text-foreground">
                  {selectedTeacher.qualification || "N/A"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Subjects</p>
                <p className="font-medium text-foreground">{selectedTeacher.subject || "N/A"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Classes</p>
                <p className="font-medium text-foreground">
                  {selectedTeacher.classes.join(", ") || "N/A"}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="font-medium text-foreground">{selectedTeacher.phone || "N/A"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3">
                <p className="text-xs text-muted-foreground">Join Date</p>
                <p className="font-medium text-foreground">{selectedTeacher.joinDate || "N/A"}</p>
              </div>
              <div className="rounded-lg border border-border bg-background p-3 sm:col-span-2">
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="font-medium text-foreground">{selectedTeacher.address || "N/A"}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-background p-3">
              <p className="text-xs text-muted-foreground mb-2">
                Class-wise Subject Assignment
              </p>
              {selectedTeacher.classSubjects &&
              Object.keys(selectedTeacher.classSubjects).length > 0 ? (
                <div className="space-y-1">
                  {Object.entries(selectedTeacher.classSubjects).map(([className, subjects]) => (
                    <p key={className} className="text-sm text-foreground">
                      <span className="font-medium">{className}:</span>{" "}
                      {subjects.length > 0 ? subjects.join(", ") : "No subjects assigned"}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Class-wise mapping not available for this teacher.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchTeacherSection;
