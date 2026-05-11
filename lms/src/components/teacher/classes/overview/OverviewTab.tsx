import { Plus, Save, Trash2, Upload, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Course, StudyMaterial } from "@/types/domain";
import { materialIcon } from "../classUtils";
import { toast } from "sonner";
import { uploadImageToCloudinary, deleteFileFromCloudinary, uploadFileToCloudinary } from "@/lib/cloudinary-upload";

type WeeklyScheduleItem = {
  day: string;
  startTime: string;
  endTime: string;
  topic?: string;
  location?: string;
};

type RecentMaterialItem = {
  title: string;
  type: string;
  url?: string;
  publicId?: string;
  content?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

type RecommendedBookItem = {
  title: string;
  author: string;
  fileUrl?: string;
};

type OverviewPayload = {
  title: string;
  description: string;
  learningOutcomes: string[];
  objectives: string[];
  thumbnailUrl?: string;
  weeklySchedule: WeeklyScheduleItem[];
  recentMaterials?: RecentMaterialItem[];
  recommendedBooks?: RecommendedBookItem[];
};

interface Props {
  selectedClass: Course & {
    overviewTitle?: string;
    learningOutcomes?: string[];
    objectives?: string[];
    thumbnailUrl?: string;
    weeklySchedule?: WeeklyScheduleItem[];
  };
  onSaveOverview: (payload: OverviewPayload) => Promise<void>;
  onAddMaterial: (material: Omit<StudyMaterial, "id">) => void;
  onDeleteMaterial: (materialId: string) => void;
  titleDraft: string;
  setTitleDraft: (value: string | ((prev: string) => string)) => void;
  overviewDraft: string;
  setOverviewDraft: (value: string | ((prev: string) => string)) => void;
  outcomesDraft: string;
  setOutcomesDraft: (value: string | ((prev: string) => string)) => void;
  objectivesDraft: string;
  setObjectivesDraft: (value: string | ((prev: string) => string)) => void;
  thumbnailDraft: string;
  setThumbnailDraft: (value: string | ((prev: string) => string)) => void;
  thumbnailPublicId: string | null;
  setThumbnailPublicId: (value: string | null | ((prev: string | null) => string | null)) => void;
  thumbnailUploading: boolean;
  setThumbnailUploading: (value: boolean) => void;
  overviewLastSavedAt: string | null;
  weeklySchedule: WeeklyScheduleItem[];
  setWeeklySchedule: (value: WeeklyScheduleItem[] | ((prev: WeeklyScheduleItem[]) => WeeklyScheduleItem[])) => void;
  recentMaterials: any[];
  setRecentMaterials: (value: any[] | ((prev: any[]) => any[])) => void;
  materialTitle: string;
  setMaterialTitle: (value: string | ((prev: string) => string)) => void;
  materialUrl: string;
  setMaterialUrl: (value: string | ((prev: string) => string)) => void;
  materialContent: string;
  setMaterialContent: (value: string | ((prev: string) => string)) => void;
  materialFile: File | null;
  setMaterialFile: (value: File | null | ((prev: File | null) => File | null)) => void;
}

const emptySlot = (): WeeklyScheduleItem => ({
  day: "",
  startTime: "",
  endTime: "",
  topic: "",
  location: "",
});

const OverviewTab = ({ 
  selectedClass, 
  onSaveOverview, 
  onAddMaterial,
  titleDraft,
  setTitleDraft,
  overviewDraft,
  setOverviewDraft,
  outcomesDraft,
  setOutcomesDraft,
  objectivesDraft,
  setObjectivesDraft,
  thumbnailDraft,
  setThumbnailDraft,
  thumbnailPublicId,
  setThumbnailPublicId,
  thumbnailUploading,
  setThumbnailUploading,
  overviewLastSavedAt,
  weeklySchedule,
  setWeeklySchedule,
  recentMaterials,
  setRecentMaterials,
  onDeleteMaterial,
  materialTitle,
  setMaterialTitle,
  materialUrl,
  setMaterialUrl,
  materialContent,
  setMaterialContent,
  materialFile,
  setMaterialFile,
}: Props) => {

  const isOverviewDirty = useMemo(
    () =>
      titleDraft !== (selectedClass.overviewTitle || selectedClass.name || "") ||
      overviewDraft !== (selectedClass.description || "") ||
      outcomesDraft !== (selectedClass.learningOutcomes ?? []).join("\n") ||
      objectivesDraft !== (selectedClass.objectives ?? []).join("\n") ||
      thumbnailDraft !== (selectedClass.thumbnailUrl || "") ||
      JSON.stringify(weeklySchedule) !== JSON.stringify(selectedClass.weeklySchedule ?? []) ||
      JSON.stringify(recentMaterials) !== JSON.stringify((selectedClass as any).recentMaterials ?? []),
    [
      titleDraft,
      selectedClass.overviewTitle,
      selectedClass.name,
      overviewDraft,
      selectedClass.description,
      outcomesDraft,
      selectedClass.learningOutcomes,
      objectivesDraft,
      selectedClass.objectives,
      thumbnailDraft,
      selectedClass.thumbnailUrl,
      weeklySchedule,
      selectedClass.weeklySchedule,
      recentMaterials,
      (selectedClass as any).recentMaterials,
    ],
  );

  const canSaveOverview = useMemo(
    () =>
      isOverviewDirty &&
      overviewDraft.trim().length >= 10 &&
      titleDraft.trim().length >= 2,
    [isOverviewDirty, overviewDraft, titleDraft],
  );

  const canAdd = useMemo(() => {
    const hasTitle = materialTitle.trim().length > 0;
    const hasFile = !!materialFile;
    const hasUrl = materialUrl.trim().length > 0;
    return hasTitle && (hasFile !== hasUrl);
  }, [materialTitle, materialFile, materialUrl]);

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setThumbnailUploading(true);
    try {
      // Delete old image if exists
      if (thumbnailPublicId) {
        await deleteFileFromCloudinary(thumbnailPublicId, "image");
      }

      // Upload new image
      const uploadedImage = await uploadImageToCloudinary(file, "courses");
      setThumbnailDraft(uploadedImage.secureUrl);
      setThumbnailPublicId(uploadedImage.publicId);
      toast.success("Thumbnail uploaded successfully");
    } catch (error) {
      toast.error("Failed to upload thumbnail");
      console.error(error);
    } finally {
      setThumbnailUploading(false);
    }
  };

  const handleRemoveThumbnail = async () => {
    if (!thumbnailPublicId) return;

    try {
      await deleteFileFromCloudinary(thumbnailPublicId, "image");
      setThumbnailDraft("");
      setThumbnailPublicId(null);
      toast.success("Thumbnail removed");
    } catch (error) {
      toast.error("Failed to remove thumbnail");
      console.error(error);
    }
  };

  const inferFileType = (name: string): StudyMaterial["type"] => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (ext === "doc" || ext === "docx") return "doc";
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image" as StudyMaterial["type"];
    if (ext === "mp4" || ext === "webm" || ext === "mov") return "video";
    return "note";
  };

  const isAllowedFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["pdf", "doc", "docx", "png", "jpg", "jpeg", "webp", "gif", "bmp", "mp4", "webm", "mov"].includes(ext);
  };

  const handleSaveOverview = async () => {
    if (!canSaveOverview) return;
    const normalizeLines = (value: string) =>
      value
        .split("\n")
        .map((entry) => entry.trim())
        .filter(Boolean);

    const payload = {
      title: titleDraft.trim(),
      description: overviewDraft.trim(),
      learningOutcomes: normalizeLines(outcomesDraft),
      objectives: normalizeLines(objectivesDraft),
      thumbnailUrl: thumbnailDraft.trim() || undefined,
      thumbnailPublicId: thumbnailPublicId || undefined,
      weeklySchedule: weeklySchedule
        .map((slot) => ({
          day: slot.day.trim(),
          startTime: slot.startTime.trim(),
          endTime: slot.endTime.trim(),
          topic: slot.topic?.trim(),
          location: slot.location?.trim(),
        }))
        .filter((slot) => slot.day && slot.startTime && slot.endTime),
      recentMaterials: recentMaterials.map((material) => ({
        title: String(material?.title ?? "").trim(),
        type: String(material?.type ?? "other"),
        url: String(material?.url ?? "").trim() || undefined,
        publicId: String(material?.publicId ?? "").trim() || undefined,
        content: String(material?.content ?? "").trim() || undefined,
        resourceType: material?.resourceType,
        originalFileName: String(material?.originalFileName ?? "").trim() || undefined,
        mimeType: String(material?.mimeType ?? "").trim() || undefined,
        sizeBytes: typeof material?.sizeBytes === "number" ? material.sizeBytes : undefined,
      })),
    };
    console.log('[OverviewTab] Saving overview with payload:', payload);
    onSaveOverview(payload);
  };

  const [materialUploading, setMaterialUploading] = useState(false);

  const handleAdd = async () => {
    if (!canAdd) return;
    if (materialFile && materialUrl.trim()) {
      toast.error("Please provide either a file or a URL, not both.");
      return;
    }
    if (materialFile && !isAllowedFile(materialFile.name)) {
      toast.error("Only PDF, Word, or PowerPoint files are allowed.");
      return;
    }
    const nextType = materialFile ? inferFileType(materialFile.name) : "link";
    
    let finalUrl = materialUrl.trim() || undefined;
    let publicId: string | undefined = undefined;

    if (materialFile) {
      setMaterialUploading(true);
      try {
        const uploaded = await uploadFileToCloudinary(materialFile, "courses/materials");
        finalUrl = uploaded.secureUrl;
        publicId = uploaded.publicId;
      } catch (error) {
        toast.error("Failed to upload material file");
        setMaterialUploading(false);
        return;
      }
      setMaterialUploading(false);
    }

    onAddMaterial({
      title: materialTitle.trim(),
      type: nextType,
      url: finalUrl,
      publicId,
      content: materialContent.trim() || undefined,
    });

    setMaterialTitle("");
    setMaterialUrl("");
    setMaterialContent("");
    setMaterialFile(null);
  };

  const handleDeleteMaterial = async (mat: any) => {
    onDeleteMaterial(mat.id);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">Course Overview</h3>
      <label className="text-sm font-medium text-foreground">Overview Title</label>
      <input
        value={titleDraft}
        onChange={(e) => setTitleDraft(e.target.value)}
        placeholder="Course title for students"
        className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />
      <label className="text-sm font-medium text-foreground">Overview</label>
      <textarea
        value={overviewDraft}
        onChange={(e) => setOverviewDraft(e.target.value)}
        placeholder="Write a brief course overview..."
        className="mt-2 w-full min-h-[110px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
      />

      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-foreground">Learning Outcomes (one per line)</label>
          <textarea
            value={outcomesDraft}
            onChange={(e) => setOutcomesDraft(e.target.value)}
            placeholder="Students will be able to..."
            className="mt-2 w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground">Course Objectives (one per line)</label>
          <textarea
            value={objectivesDraft}
            onChange={(e) => setObjectivesDraft(e.target.value)}
            placeholder="Objective 1"
            className="mt-2 w-full min-h-[100px] rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
      </div>

      <label className="mt-4 block text-sm font-medium text-foreground">Course Thumbnail</label>
      <div className="mt-2 flex flex-col gap-4">
        {thumbnailDraft ? (
          <div className="relative w-full max-w-sm rounded-lg overflow-hidden border border-border">
            <img
              src={thumbnailDraft}
              alt="Course thumbnail"
              className="w-full h-40 object-cover"
            />
            <button
              type="button"
              onClick={handleRemoveThumbnail}
              disabled={thumbnailUploading}
              className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        <label className="relative inline-flex items-center gap-2 rounded-lg border border-dashed border-primary px-4 py-3 cursor-pointer hover:bg-primary/5 disabled:opacity-50">
          {thumbnailUploading ? (
            <>
              <span className="spinner h-4 w-4" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary">
                {thumbnailDraft ? "Change Thumbnail" : "Upload Thumbnail"}
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg, image/png, image/webp"
            onChange={handleThumbnailUpload}
            disabled={thumbnailUploading}
            className="hidden"
          />
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-border p-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">Weekly Timetable</h4>
          <button
            type="button"
            onClick={() => setWeeklySchedule((prev) => [...prev, emptySlot()])}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="h-3 w-3" /> Add Slot
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {weeklySchedule.map((slot, index) => (
            <div key={`slot-${index}`} className="grid grid-cols-1 md:grid-cols-6 gap-2 items-center">
              <input
                value={slot.day}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, day: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Day"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.startTime}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, startTime: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Start"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.endTime}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, endTime: e.target.value } : item,
                    ),
                  )
                }
                placeholder="End"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.topic ?? ""}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, topic: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Topic"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <input
                value={slot.location ?? ""}
                onChange={(e) =>
                  setWeeklySchedule((prev) =>
                    prev.map((item, idx) =>
                      idx === index ? { ...item, location: e.target.value } : item,
                    ),
                  )
                }
                placeholder="Location"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              />
              <button
                type="button"
                onClick={() =>
                  setWeeklySchedule((prev) =>
                    prev.length > 1 ? prev.filter((_, idx) => idx !== index) : prev,
                  )
                }
                className="inline-flex items-center justify-center rounded-lg border border-border px-2 py-2 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={handleSaveOverview}
        disabled={!canSaveOverview}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
      >
        <Save className="h-4 w-4" /> Save Overview
      </button>
      {overviewLastSavedAt ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Last saved: {new Date(overviewLastSavedAt).toLocaleString()}
        </p>
      ) : null}

      <h4 className="font-medium text-foreground mb-3">Recent Materials</h4>
      {recentMaterials && recentMaterials.length > 0 ? (
        <div className="space-y-2">
          {recentMaterials.map((mat) => {
            const Icon = materialIcon(mat.type);
            return (
              <div key={mat.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{mat.title}</span>
                    {mat.content && <span className="text-xs text-muted-foreground">{mat.content}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {mat.url && (
                    <a
                      href={mat.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm"
                    >
                      View
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setMaterialTitle(mat.title);
                      setMaterialContent(mat.content || "");
                      setMaterialUrl(mat.url || "");
                      setRecentMaterials((prev) => prev.filter((m) => m.id !== mat.id));
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMaterial(mat)}
                    className="text-xs text-destructive hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No materials added yet.</p>
      )}

      <div className="mt-6 border-t border-border pt-4">
        <h4 className="font-medium text-foreground mb-2">Add Material</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={materialTitle}
            onChange={(e) => setMaterialTitle(e.target.value)}
            placeholder="Material title"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            type="file"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.gif,.bmp,.mp4,.webm,.mov"
            onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={materialUrl}
            onChange={(e) => setMaterialUrl(e.target.value)}
            placeholder="URL (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={materialContent}
            onChange={(e) => setMaterialContent(e.target.value)}
            placeholder="Short note/content (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          onClick={handleAdd}
          disabled={!canAdd || materialUploading}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          {materialUploading ? (
            <>
              <span className="spinner h-4 w-4" /> Uploading...
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" /> Add Material
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OverviewTab;
