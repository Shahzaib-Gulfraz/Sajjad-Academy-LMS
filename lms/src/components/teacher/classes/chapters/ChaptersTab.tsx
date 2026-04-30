import { Check, ChevronDown, ChevronUp, Edit2, Folder, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Course, StudyMaterial } from "@/types/domain";
import { materialIcon } from "../classUtils";
import { toast } from "sonner";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";

interface Props {
  selectedClass: Course;
  expandedChapters: Set<number>;
  expandedTopics: Set<number>;
  onToggleChapter: (chapterId: number) => void;
  onToggleTopic: (topicId: number) => void;
  onAddChapter: (data: { chapterNumber: number; chapterName: string; description?: string }) => void;
  onUpdateChapter: (
    chapterId: number,
    patch: { chapterNumber?: number; chapterName?: string; description?: string },
  ) => void;
  onDeleteChapter: (chapterId: number) => void;
  onAddChapterMaterial: (chapterId: number, material: Omit<StudyMaterial, "id">) => void;
  onAddTopic: (chapterId: number, topicName: string) => void;
  onUpdateTopic: (chapterId: number, topicId: number, topicName: string) => void;
  onDeleteTopic: (chapterId: number, topicId: number) => void;
  onAddTopicMaterial: (
    chapterId: number,
    topicId: number,
    material: Omit<StudyMaterial, "id">,
  ) => void;
}

const ChaptersTab = ({
  selectedClass,
  expandedChapters,
  expandedTopics,
  onToggleChapter,
  onToggleTopic,
  onAddChapter,
  onUpdateChapter,
  onDeleteChapter,
  onAddChapterMaterial,
  onAddTopic,
  onUpdateTopic,
  onDeleteTopic,
  onAddTopicMaterial,
}: Props) => {
  const [newChapterNumber, setNewChapterNumber] = useState("");
  const [newChapterName, setNewChapterName] = useState("");
  const [newChapterDescription, setNewChapterDescription] = useState("");

  type MaterialDraft = { title: string; url: string; content: string; file: File | null };
  const [chapterMaterialDrafts, setChapterMaterialDrafts] = useState<Record<number, MaterialDraft>>(
    {},
  );
  const [topicMaterialDrafts, setTopicMaterialDrafts] = useState<Record<string, MaterialDraft>>({});
  const [topicDrafts, setTopicDrafts] = useState<Record<number, string>>({});
  const [uploadingChapterId, setUploadingChapterId] = useState<number | null>(null);
  const [uploadingTopicId, setUploadingTopicId] = useState<string | null>(null);

  const [editingChapterId, setEditingChapterId] = useState<number | null>(null);
  const [chapterEditState, setChapterEditState] = useState<{
    chapterNumber: string;
    chapterName: string;
    description: string;
  } | null>(null);

  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  const [topicEditName, setTopicEditName] = useState("");

  const chapterNumberValue = useMemo(() => Number(newChapterNumber), [newChapterNumber]);
  const canAddChapter = useMemo(
    () =>
      newChapterName.trim().length > 0 &&
      newChapterNumber.trim().length > 0 &&
      !Number.isNaN(chapterNumberValue),
    [newChapterName, newChapterNumber, chapterNumberValue],
  );

  const handleAddChapter = () => {
    if (!canAddChapter) return;
    onAddChapter({
      chapterNumber: chapterNumberValue,
      chapterName: newChapterName.trim(),
      description: newChapterDescription.trim() || undefined,
    });
    setNewChapterNumber("");
    setNewChapterName("");
    setNewChapterDescription("");
  };

  const getChapterDraft = (chapterId: number) =>
    chapterMaterialDrafts[chapterId] || { title: "", url: "", content: "", file: null };

  const setChapterDraft = (chapterId: number, patch: Partial<MaterialDraft>) => {
    setChapterMaterialDrafts((prev) => ({
      ...prev,
      [chapterId]: { ...getChapterDraft(chapterId), ...patch },
    }));
  };

  const getTopicDraft = (chapterId: number, topicId: number) =>
    topicMaterialDrafts[`${chapterId}:${topicId}`] || {
      title: "",
      url: "",
      content: "",
      file: null,
    };

  const setTopicDraft = (
    chapterId: number,
    topicId: number,
    patch: Partial<MaterialDraft>,
  ) => {
    const key = `${chapterId}:${topicId}`;
    setTopicMaterialDrafts((prev) => ({
      ...prev,
      [key]: { ...getTopicDraft(chapterId, topicId), ...patch },
    }));
  };

  const inferFileType = (name: string): StudyMaterial["type"] => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    if (ext === "pdf") return "pdf";
    if (ext === "doc" || ext === "docx") return "doc";
    if (ext === "ppt" || ext === "pptx") return "ppt";
    if (["png", "jpg", "jpeg", "webp", "gif", "bmp"].includes(ext)) return "image" as StudyMaterial["type"];
    if (ext === "mp4" || ext === "webm" || ext === "mov") return "video";
    return "note";
  };

  const isAllowedFile = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase() || "";
    return ["pdf", "doc", "docx", "ppt", "pptx", "png", "jpg", "jpeg", "webp", "gif", "bmp", "mp4", "webm", "mov"].includes(ext);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Course Chapters</h3>
      </div>
      <div className="bg-muted/10 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-foreground mb-3">Add New Chapter</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={newChapterNumber}
            onChange={(e) => setNewChapterNumber(e.target.value)}
            placeholder="Chapter number"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={newChapterName}
            onChange={(e) => setNewChapterName(e.target.value)}
            placeholder="Chapter name"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
          <input
            value={newChapterDescription}
            onChange={(e) => setNewChapterDescription(e.target.value)}
            placeholder="Short description (optional)"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
          />
        </div>
        <button
          onClick={handleAddChapter}
          disabled={!canAddChapter}
          className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> Add Chapter
        </button>
      </div>
      {selectedClass.chapters && selectedClass.chapters.length > 0 ? (
        <div className="space-y-4">
          {selectedClass.chapters.map((chapter) => (
            <div key={chapter.id} className="border border-border rounded-lg overflow-hidden">
              <div
                onClick={() => onToggleChapter(chapter.id)}
                className="flex items-center justify-between p-4 bg-muted/10 cursor-pointer hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">
                    Chapter {chapter.chapterNumber}: {chapter.chapterName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteChapter(chapter.id);
                    }}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Delete Chapter"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <div className="text-muted-foreground">
                    {expandedChapters.has(chapter.id) ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </div>
                </div>
              </div>

              {expandedChapters.has(chapter.id) && (
                <div className="p-4 border-t border-border">
                  <div className="bg-muted/5 rounded-xl p-4 mb-4 border border-border/40">
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-sm font-medium text-foreground">Chapter Settings</h5>
                      {editingChapterId === chapter.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (chapterEditState) {
                                onUpdateChapter(chapter.id, {
                                  chapterNumber: Number(chapterEditState.chapterNumber),
                                  chapterName: chapterEditState.chapterName,
                                  description: chapterEditState.description,
                                });
                              }
                              setEditingChapterId(null);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20"
                          >
                            <Check className="h-3.5 w-3.5" /> Save Changes
                          </button>
                          <button
                            onClick={() => setEditingChapterId(null)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80"
                          >
                            <X className="h-3.5 w-3.5" /> Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingChapterId(chapter.id);
                            setChapterEditState({
                              chapterNumber: String(chapter.chapterNumber),
                              chapterName: chapter.chapterName,
                              description: (chapter as any).description || "",
                            });
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/50"
                        >
                          <Edit2 className="h-3.5 w-3.5" /> Edit Chapter
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Chapter No.</label>
                        <input
                          value={editingChapterId === chapter.id ? chapterEditState?.chapterNumber : chapter.chapterNumber}
                          disabled={editingChapterId !== chapter.id}
                          onChange={(e) =>
                            setChapterEditState((prev) => prev ? { ...prev, chapterNumber: e.target.value } : null)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                          placeholder="Chapter number"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Chapter Title</label>
                        <input
                          value={editingChapterId === chapter.id ? chapterEditState?.chapterName : chapter.chapterName}
                          disabled={editingChapterId !== chapter.id}
                          onChange={(e) =>
                            setChapterEditState((prev) => prev ? { ...prev, chapterName: e.target.value } : null)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                          placeholder="Chapter name"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground ml-1">Description</label>
                        <input
                          value={editingChapterId === chapter.id ? chapterEditState?.description : (chapter as any).description || ""}
                          disabled={editingChapterId !== chapter.id}
                          onChange={(e) =>
                            setChapterEditState((prev) => prev ? { ...prev, description: e.target.value } : null)
                          }
                          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-60"
                          placeholder="Description (optional)"
                        />
                      </div>
                    </div>
                  </div>
                  {chapter.materials && chapter.materials.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-sm font-medium text-foreground mb-2">Chapter Materials</h5>
                      <div className="space-y-2">
                        {chapter.materials.map((mat) => {
                          const Icon = materialIcon(mat.type);
                          return (
                            <div key={mat.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                              <div className="flex items-center gap-2">
                                <Icon className="h-4 w-4 text-primary" />
                                <span className="text-sm">{mat.title}</span>
                              </div>
                              {mat.url && (
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary text-xs hover:underline"
                                >
                                  View
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="bg-muted/10 rounded-lg p-3 mb-4">
                    <h6 className="text-sm font-medium text-foreground mb-2">Add Chapter Material</h6>
                    {(() => {
                      const draft = getChapterDraft(chapter.id);
                      const hasTitle = draft.title.trim().length > 0;
                      const hasFile = !!draft.file;
                      const hasUrl = draft.url.trim().length > 0;
                      const canAdd = hasTitle && (hasFile !== hasUrl);
                      return (
                        <>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                            <input
                              value={draft.title}
                              onChange={(e) => setChapterDraft(chapter.id, { title: e.target.value })}
                              placeholder="Title"
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.ppt,.pptx"
                              onChange={(e) =>
                                setChapterDraft(chapter.id, { file: e.target.files?.[0] || null })
                              }
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <input
                              value={draft.url}
                              onChange={(e) => setChapterDraft(chapter.id, { url: e.target.value })}
                              placeholder="URL (optional)"
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                            <input
                              value={draft.content}
                              onChange={(e) => setChapterDraft(chapter.id, { content: e.target.value })}
                              placeholder="Short note (optional)"
                              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                          </div>
                          <button
                            onClick={async () => {
                              if (!canAdd) return;
                              if (draft.file && draft.url.trim()) {
                                toast.error("Please provide either a file or a URL, not both.");
                                return;
                              }
                              if (draft.file && !isAllowedFile(draft.file.name)) {
                                toast.error("File type not supported.");
                                return;
                              }
                              
                              let finalUrl = draft.url.trim() || undefined;
                              let publicId: string | undefined = undefined;

                              if (draft.file) {
                                setUploadingChapterId(chapter.id);
                                try {
                                  const uploaded = await uploadFileToCloudinary(draft.file, `courses/chapters/${chapter.id}`);
                                  finalUrl = uploaded.secureUrl;
                                  publicId = uploaded.publicId;
                                } catch (e) {
                                  toast.error("Failed to upload file to Cloudinary");
                                  setUploadingChapterId(null);
                                  return;
                                }
                                setUploadingChapterId(null);
                              }

                              const nextType = draft.file
                                ? inferFileType(draft.file.name)
                                : "link";

                              onAddChapterMaterial(chapter.id, {
                                title: draft.title.trim(),
                                type: nextType,
                                url: finalUrl,
                                publicId,
                                content: draft.content.trim() || undefined,
                              });
                              setChapterDraft(chapter.id, {
                                title: "",
                                url: "",
                                content: "",
                                file: null,
                              });
                            }}
                            disabled={!canAdd || uploadingChapterId === chapter.id}
                            className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-1.5 text-sm text-primary hover:bg-primary/10 disabled:opacity-50"
                          >
                            {uploadingChapterId === chapter.id ? (
                              <>
                                <span className="spinner h-4 w-4" /> Uploading...
                              </>
                            ) : (
                              <>
                                <Plus className="h-4 w-4" /> Add Material
                              </>
                            )}
                          </button>
                        </>
                      );
                    })()}
                  </div>

                  <h5 className="text-sm font-medium text-foreground mb-2">Topics</h5>
                  {chapter.topics && chapter.topics.length > 0 ? (
                    <div className="space-y-3">
                      {chapter.topics.map((topic) => (
                        <div key={topic.id} className="ml-4 border-l-2 border-primary/30 pl-3">
                          <div className="flex items-center justify-between bg-muted/5 p-2 rounded-lg group">
                            <div className="flex items-center gap-3 flex-1">
                              {editingTopicId === topic.id ? (
                                <input
                                  autoFocus
                                  value={topicEditName}
                                  onChange={(e) => setTopicEditName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      onUpdateTopic(chapter.id, topic.id, topicEditName);
                                      setEditingTopicId(null);
                                    } else if (e.key === "Escape") {
                                      setEditingTopicId(null);
                                    }
                                  }}
                                  className="flex-1 rounded-md border border-primary bg-background px-2 py-1 text-sm text-foreground"
                                />
                              ) : (
                                <span className="text-sm font-medium text-foreground">{topic.topicName}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              {editingTopicId === topic.id ? (
                                <>
                                  <button
                                    onClick={() => {
                                      onUpdateTopic(chapter.id, topic.id, topicEditName);
                                      setEditingTopicId(null);
                                    }}
                                    className="p-1.5 text-primary hover:bg-primary/10 rounded-md"
                                  >
                                    <Check className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingTopicId(null)}
                                    className="p-1.5 text-muted-foreground hover:bg-muted rounded-md"
                                  >
                                    <X className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingTopicId(topic.id);
                                      setTopicEditName(topic.topicName);
                                    }}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                    title="Edit Topic"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteTopic(chapter.id, topic.id)}
                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                    title="Delete Topic"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>
                              )}
                              <button
                                onClick={() => onToggleTopic(topic.id)}
                                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md"
                              >
                                {expandedTopics.has(topic.id) ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          </div>

                          {expandedTopics.has(topic.id) && (
                            <div className="mt-2 space-y-2">
                              {topic.materials && topic.materials.length > 0 ? (
                                topic.materials.map((mat) => {
                                  const Icon = materialIcon(mat.type);
                                  return (
                                    <div key={mat.id} className="flex items-center justify-between p-2 bg-muted/10 rounded">
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <span className="text-sm">{mat.title}</span>
                                      </div>
                                      {mat.url && (
                                        <a
                                          href={mat.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-primary text-xs hover:underline"
                                        >
                                          View
                                        </a>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <p className="text-xs text-muted-foreground">No materials for this topic.</p>
                              )}
                              <div className="bg-muted/10 rounded-lg p-2">
                                {(() => {
                                  const draft = getTopicDraft(chapter.id, topic.id);
                                  const hasTitle = draft.title.trim().length > 0;
                                  const hasFile = !!draft.file;
                                  const hasUrl = draft.url.trim().length > 0;
                                  const canAdd = hasTitle && (hasFile !== hasUrl);
                                  return (
                                    <>
                                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                                        <input
                                          value={draft.title}
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, {
                                              title: e.target.value,
                                            })
                                          }
                                          placeholder="Title"
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                        <input
                                          type="file"
                                          accept=".pdf,.doc,.docx,.ppt,.pptx"
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, {
                                              file: e.target.files?.[0] || null,
                                            })
                                          }
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                        <input
                                          value={draft.url}
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, { url: e.target.value })
                                          }
                                          placeholder="URL (optional)"
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                        <input
                                          value={draft.content}
                                          onChange={(e) =>
                                            setTopicDraft(chapter.id, topic.id, {
                                              content: e.target.value,
                                            })
                                          }
                                          placeholder="Short note (optional)"
                                          className="rounded-lg border border-border bg-background px-2 py-1 text-sm text-foreground"
                                        />
                                      </div>
                                      <button
                                        onClick={async () => {
                                          if (!canAdd) return;
                                          if (draft.file && draft.url.trim()) {
                                            toast.error("Please provide either a file or a URL, not both.");
                                            return;
                                          }
                                          if (draft.file && !isAllowedFile(draft.file.name)) {
                                            toast.error("File type not supported.");
                                            return;
                                          }

                                          const topicKey = `${chapter.id}:${topic.id}`;
                                          let finalUrl = draft.url.trim() || undefined;
                                          let publicId: string | undefined = undefined;

                                          if (draft.file) {
                                            setUploadingTopicId(topicKey);
                                            try {
                                              const uploaded = await uploadFileToCloudinary(draft.file, `courses/topics/${topic.id}`);
                                              finalUrl = uploaded.secureUrl;
                                              publicId = uploaded.publicId;
                                            } catch (e) {
                                              toast.error("Failed to upload file to Cloudinary");
                                              setUploadingTopicId(null);
                                              return;
                                            }
                                            setUploadingTopicId(null);
                                          }

                                          const nextType = draft.file
                                            ? inferFileType(draft.file.name)
                                            : "link";
                                          
                                          onAddTopicMaterial(chapter.id, topic.id, {
                                            title: draft.title.trim(),
                                            type: nextType,
                                            url: finalUrl,
                                            publicId,
                                            content: draft.content.trim() || undefined,
                                          });
                                          setTopicDraft(chapter.id, topic.id, {
                                            title: "",
                                            url: "",
                                            content: "",
                                            file: null,
                                          });
                                        }}
                                        disabled={!canAdd || uploadingTopicId === `${chapter.id}:${topic.id}`}
                                        className="mt-2 inline-flex items-center gap-2 rounded-lg border border-primary px-2 py-1 text-xs text-primary hover:bg-primary/10 disabled:opacity-50"
                                      >
                                        {uploadingTopicId === `${chapter.id}:${topic.id}` ? (
                                          <>
                                            <span className="spinner h-3 w-3" /> Uploading...
                                          </>
                                        ) : (
                                          <>
                                            <Plus className="h-3 w-3" /> Add Topic Material
                                          </>
                                        )}
                                      </button>
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No topics in this chapter.</p>
                  )}
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      value={topicDrafts[chapter.id] || ""}
                      onChange={(e) =>
                        setTopicDrafts((prev) => ({ ...prev, [chapter.id]: e.target.value }))
                      }
                      placeholder="New topic name"
                      className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                    />
                    <button
                      onClick={() => {
                        const name = (topicDrafts[chapter.id] || "").trim();
                        if (!name) return;
                        onAddTopic(chapter.id, name);
                        setTopicDrafts((prev) => ({ ...prev, [chapter.id]: "" }));
                      }}
                      className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10"
                    >
                      <Plus className="h-4 w-4" /> Add Topic
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No chapters added yet.</p>
      )}
    </div>
  );
};

export default ChaptersTab;
