import { BookOpen, ImagePlus, Library, Plus, Trash2, UploadCloud, Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import type { Course, StudyMaterial } from "@/types/domain";
import { materialIcon } from "../classUtils";
import { apiAuthRequest } from "@/lib/api";
import { uploadFileToCloudinary } from "@/lib/cloudinary-upload";
import { useToast } from "@/hooks/use-toast";
import { loadAuthSession } from "@/lib/auth";
import {
  ensureCourseByClassAndSubject,
  createCourse,
  addChapter,
  updateChapter,
  deleteChapter,
  addTopic,
  deleteTopic,
  type CourseData,
  type CourseChapter,
} from "@/lib/course-api";

interface Props {
  selectedClass: Course;
  onAddMaterial?: (m: Omit<StudyMaterial, "id">) => void;
  onRemoveMaterial?: (id: string) => void;
  onSaveOverview?: (payload: {
    title: string;
    description: string;
    learningOutcome: string;
    objectives: string[];
    thumbnailUrl?: string;
    thumbnailPublicId?: string | null;
    recommendedBooks?: Array<{
      title: string;
      author: string;
      fileUrl?: string;
    }>;
  }) => Promise<void> | void;
    onPatchRecommendedBooks?: (recommendedBooks: Array<{
      title: string;
      author: string;
      fileUrl?: string;
    }>) => Promise<void> | void;
  isSaving?: boolean;
}

type StudioTab = "overview" | "chapters";

type BookDraft = {
  id: string;
  title: string;
  author: string;
  fileName?: string;
  fileObject?: File;
  publicId?: string;
  url?: string;
};

type TopicMaterialDraft = {
  id: string;
  title: string;
  type: StudyMaterial["type"];
  url: string;
  fileName: string;
  publicId?: string;
  resourceType?: "image" | "video" | "raw" | "auto";
  originalFileName?: string;
  mimeType?: string;
  sizeBytes?: number;
};

type TopicDraft = {
  id: string;
  name: string;
  materials: TopicMaterialDraft[];
};

type ChapterDraft = {
  id: string;
  name: string;
  description: string;
  outcomesText: string;
  topics: TopicDraft[];
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const MATERIAL_TYPES: StudyMaterial["type"][] = [
  "audio",
  "video",
  "pdf",
  "doc",
  "ppt",
  "image",
  "link",
  "note",
  "other",
];

const MaterialsTab = ({
  selectedClass,
  onAddMaterial,
  onRemoveMaterial,
  onSaveOverview,
    onPatchRecommendedBooks,
  isSaving = false,
}: Props) => {
  const { classId, courseId } = useParams<{ classId?: string; courseId?: string }>();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<StudioTab>("overview");
  const [isSavingMaterial, setIsSavingMaterial] = useState(false);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [isFetchingCourse, setIsFetchingCourse] = useState(false);

  const [courseDescription, setCourseDescription] = useState(selectedClass.description || "");
  const [learningOutcomes, setLearningOutcomes] = useState("");
  const [thumbnailFileName, setThumbnailFileName] = useState("");
  const thumbnailInputRef = useRef<HTMLInputElement | null>(null);

  const [books, setBooks] = useState<BookDraft[]>([]);
  const [bookTitle, setBookTitle] = useState("");
  const [bookAuthor, setBookAuthor] = useState("");
  const [bookFileName, setBookFileName] = useState("");
  const bookInputRef = useRef<HTMLInputElement | null>(null);

  const [chapters, setChapters] = useState<ChapterDraft[]>(() =>
    (selectedClass.chapters || []).map((ch) => ({
      id: String(ch.id),
      name: ch.chapterName,
      description: ch.description || "",
      outcomesText: "",
      topics: (ch.topics || []).map((tp) => ({
        id: String(tp.id),
        name: tp.topicName,
        materials: [],
      })),
    })),
  );
  const [chapterName, setChapterName] = useState("");
  const [chapterDescription, setChapterDescription] = useState("");
  const [chapterOutcomes, setChapterOutcomes] = useState("");
  const [topicInputs, setTopicInputs] = useState<Record<string, string>>({});
  const [materialDrafts, setMaterialDrafts] = useState<Record<string, TopicMaterialDraft>>({});
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const [editChapterId, setEditChapterId] = useState<string | null>(null);
  const [editTopicId, setEditTopicId] = useState<string | null>(null);

  const mapChapters = (course: Course): ChapterDraft[] =>
    (course.chapters || []).map((ch) => ({
      id: String(ch.id),
      name: ch.chapterName,
      description: ch.description || "",
      outcomesText: "",
      topics: (ch.topics || []).map((tp) => ({
        id: String(tp.id),
        name: tp.topicName,
        materials: (tp.materials || []).map((mat) => ({
          id: String(mat.id),
          title: mat.title,
          type: mat.type,
          url: mat.url || "",
          fileName: mat.originalFileName || "",
          publicId: mat.publicId,
          resourceType: mat.resourceType,
          originalFileName: mat.originalFileName,
          mimeType: mat.mimeType,
          sizeBytes: mat.sizeBytes,
        })),
      })),
    }));

  // Fetch or create course data on mount
  useEffect(() => {
    const initializeCourse = async () => {
      if (!courseId || !classId) return;

      try {
        setIsFetchingCourse(true);
        const course = await ensureCourseByClassAndSubject(
          decodeURIComponent(classId),
          decodeURIComponent(courseId),
          selectedClass.name || 'Course'
        );
        setCourseData(course);
        // Update chapters from fetched course
        setChapters(
          course.chapters.map((ch) => ({
            id: ch.id,
            name: ch.chapterName,
            description: ch.description || "",
            outcomesText: "",
            topics: (ch.topics || []).map((tp) => ({
              id: tp.id,
              name: tp.topicName,
              materials: [],
            })),
          }))
        );
      } catch (error) {
        console.warn('Failed to initialize course:', error);
      } finally {
        setIsFetchingCourse(false);
      }
    };

    initializeCourse();
  }, [courseId, classId]);

  useEffect(() => {
    const overview = selectedClass.overview;

    setCourseDescription(overview?.description ?? selectedClass.description ?? "");
    // Load learningOutcome: try single string first, fallback to array
    const outcomeStr = overview?.learningOutcome 
      ? overview.learningOutcome 
      : (overview?.learningOutcomes ?? []).join("\n");
    setLearningOutcomes(outcomeStr);
    // Load thumbnail: show URL if available
    setThumbnailFileName(
      overview?.thumbnailUrl 
        ? overview.thumbnailUrl.split('/').pop() || 'Saved thumbnail'
        : (overview?.thumbnailPublicId ? 'Saved thumbnail' : '')
    );
    setBooks(
      (overview?.recommendedBooks ?? []).map((book) => ({
        id: book.id || createId(),
        title: book.title,
        author: book.author,
        fileName: book.fileUrl ? book.fileUrl.split('/').pop() || book.fileUrl : undefined,
        publicId: undefined,
        url: book.fileUrl,
      })),
    );
    setChapters(mapChapters(selectedClass));
  }, [selectedClass]);

  const handleAddBook = () => {
    if (!bookTitle.trim()) return;
    
    // Get file object if available
    const fileObject = bookInputRef.current?.files?.[0];
    
    setBooks((prev) => [
      ...prev,
      {
        id: createId(),
        title: bookTitle.trim(),
        author: bookAuthor.trim(),
        fileName: bookFileName || undefined,
        fileObject: fileObject,
      },
    ]);
    setBookTitle("");
    setBookAuthor("");
    setBookFileName("");
    if (bookInputRef.current) {
      bookInputRef.current.value = "";
    }
  };

  // Patch recommended books to existing overview (upload files first, then send to backend)
  const handlePatchBooksAfterOverview = async () => {
    if (!courseId) {
      toast({
        title: "Error",
        description: "Missing course ID from URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingMaterial(true);

      // Process books - upload files to Cloudinary
      const processedBooks = await Promise.all(
        books.map(async (book) => {
          let bookUrl = book.url || "";

          // Only upload if fileObject exists (new file)
          if (book.fileObject) {
            try {
              const uploadResponse = await uploadFileToCloudinary(
                book.fileObject,
                `courses/${decodeURIComponent(courseId)}/books`
              );
              bookUrl = uploadResponse.secureUrl;
            } catch (uploadError) {
              console.warn(`Failed to upload book file ${book.fileName}:`, uploadError);
            }
          }

          return {
            title: book.title,
            author: book.author,
            fileUrl: bookUrl,
          };
        })
      );

      // Call PATCH endpoint or callback
      if (onPatchRecommendedBooks) {
        await onPatchRecommendedBooks(processedBooks);
      } else {
        // Fallback direct API call
        await apiAuthRequest(`/materials/course/${encodeURIComponent(courseId)}/overview/recommended-books`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            recommendedBooks: processedBooks,
            classId: classId ? decodeURIComponent(classId) : decodeURIComponent(courseId),
            subjectId: decodeURIComponent(courseId),
          }),
        });
      }

      toast({
        title: "Success",
        description: "Recommended books added successfully",
      });

      // Update local books state with uploaded URLs
      setBooks(
        processedBooks.map((book) => ({
          id: createId(),
          title: book.title,
          author: book.author,
          fileName: book.fileUrl ? book.fileUrl.split('/').pop() || book.fileUrl : undefined,
          publicId: undefined,
          url: book.fileUrl,
        })),
      );
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to add books: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingMaterial(false);
    }
  };

  // Delete a recommended book (persist via PATCH)
  const handleDeleteBook = async (id: string) => {
    const toDelete = books.find((b) => b.id === id);
    if (!toDelete) return;

    if (!courseId) {
      toast({ title: 'Error', description: 'Missing course ID from URL', variant: 'destructive' });
      return;
    }

    const remaining = books.filter((b) => b.id !== id);

    // Optimistic UI update
    setBooks(remaining);

    const processed = remaining.map((book) => ({ title: book.title, author: book.author, fileUrl: book.url || '' }));

    try {
      setIsSavingMaterial(true);
      if (onPatchRecommendedBooks) {
        await onPatchRecommendedBooks(processed);
      } else {
        await apiAuthRequest(`/materials/course/${encodeURIComponent(courseId)}/overview/recommended-books`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            recommendedBooks: processed,
            classId: classId ? decodeURIComponent(classId) : decodeURIComponent(courseId),
            subjectId: decodeURIComponent(courseId),
          }),
        });
      }
      toast({ title: 'Success', description: 'Book removed.' });
    } catch (error) {
      // Revert on failure
      setBooks((prev) => [...prev, toDelete]);
      toast({ title: 'Error', description: `Failed to remove book: ${error instanceof Error ? error.message : 'Unknown'}`, variant: 'destructive' });
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const handleAddChapter = async () => {
    if (!chapterName.trim()) return;
    if (!courseId) {
      toast({ title: 'Error', description: 'Missing course ID', variant: 'destructive' });
      return;
    }

    const optimisticChapterId = createId();
    const newChapter: ChapterDraft = {
      id: optimisticChapterId,
      name: chapterName.trim(),
      description: chapterDescription.trim(),
      outcomesText: chapterOutcomes,
      topics: [],
    };

    // Optimistic UI update
    setChapters((prev) => [...prev, newChapter]);

    try {
      setIsSavingMaterial(true);

      // Create or fetch course first if not exists
      let course = courseData;
      if (!course) {
        course = await createCourse({
          classId: classId ? decodeURIComponent(classId) : decodeURIComponent(courseId),
          subjectId: decodeURIComponent(courseId),
          name: selectedClass.name || 'Course',
          description: courseDescription,
          chapters: [],
        });
        setCourseData(course);
      }

      // Add chapter via API (use current chapters length as chapter number)
      const updated = await addChapter(course.id, {
        chapterNumber: chapters.length + 1,
        chapterName: chapterName.trim(),
        description: chapterDescription.trim(),
      });

      setCourseData(updated);
      // Replace optimistic with real chapter data
      setChapters(
        updated.chapters.map((ch) => ({
          id: ch.id,
          name: ch.chapterName,
          description: ch.description || "",
          outcomesText: "",
          topics: (ch.topics || []).map((tp) => ({
            id: tp.id,
            name: tp.topicName,
            materials: [],
          })),
        }))
      );

      toast({ title: 'Success', description: 'Chapter added' });
    } catch (error) {
      // Revert optimistic update
      setChapters((prev) => prev.filter((ch) => ch.id !== optimisticChapterId));
      toast({
        title: 'Error',
        description: `Failed to add chapter: ${error instanceof Error ? error.message : 'Unknown'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSavingMaterial(false);
    }

    setChapterName("");
    setChapterDescription("");
    setChapterOutcomes("");
  };

  const handleAddTopic = async (chapterId: string) => {
    const value = (topicInputs[chapterId] || "").trim();
    if (!value) return;
    if (!courseData) {
      toast({ title: 'Error', description: 'Course not initialized', variant: 'destructive' });
      return;
    }

    const optimisticTopicId = createId();
    
    // Optimistic UI update
    setChapters((prev) =>
      prev.map((ch) =>
        ch.id === chapterId
          ? {
              ...ch,
              topics: [...ch.topics, { id: optimisticTopicId, name: value, materials: [] }],
            }
          : ch,
      ),
    );

    try {
      setIsSavingMaterial(true);
      const updated = await addTopic(courseData.id, chapterId, { topicName: value });
      
      setCourseData(updated);
      setChapters(
        updated.chapters.map((ch) => ({
          id: ch.id,
          name: ch.chapterName,
          description: ch.description || "",
          outcomesText: "",
          topics: (ch.topics || []).map((tp) => ({
            id: tp.id,
            name: tp.topicName,
            materials: [],
          })),
        }))
      );
      toast({ title: 'Success', description: 'Topic added' });
    } catch (error) {
      // Revert optimistic update
      setChapters((prev) =>
        prev.map((ch) =>
          ch.id === chapterId
            ? { ...ch, topics: ch.topics.filter((t) => t.id !== optimisticTopicId) }
            : ch,
        ),
      );
      toast({
        title: 'Error',
        description: `Failed to add topic: ${error instanceof Error ? error.message : 'Unknown'}`,
        variant: 'destructive',
      });
    } finally {
      setIsSavingMaterial(false);
    }

    setTopicInputs((prev) => ({ ...prev, [chapterId]: "" }));
  };

  const handleAddTopicMaterial = async (chapterId: string, topicId: string) => {
    const key = `${chapterId}:${topicId}`;
    const draft = materialDrafts[key];
    if (!draft || !draft.title.trim()) return;

    // Get file object from input if exists
    const topicMaterialInputId = `topic-material-file-${key}`;
    const fileInput = document.getElementById(topicMaterialInputId) as HTMLInputElement;
    const fileObject = fileInput?.files?.[0];

    const savedMaterial = await handleSaveMaterial({
      title: draft.title,
      type: draft.type,
      url: draft.url,
      fileName: draft.fileName,
      fileObject: fileObject,
      chapterId: chapterId,
      topicId: topicId,
    });

    if (!savedMaterial) return;

    setChapters((prev) =>
      prev.map((chapter) =>
        chapter.id !== chapterId
          ? chapter
          : {
              ...chapter,
              topics: chapter.topics.map((topic) =>
                topic.id !== topicId
                  ? topic
                  : {
                      ...topic,
                      materials: [
                        ...(topic.materials ?? []),
                        {
                          id: String(savedMaterial.id),
                          title: savedMaterial.title,
                          type: savedMaterial.type,
                          url: savedMaterial.url || "",
                          fileName: savedMaterial.originalFileName || savedMaterial.title,
                          publicId: savedMaterial.publicId,
                          resourceType: savedMaterial.resourceType,
                          originalFileName: savedMaterial.originalFileName,
                          mimeType: savedMaterial.mimeType,
                          sizeBytes: savedMaterial.sizeBytes,
                        },
                      ],
                    },
              ),
            },
      ),
    );

    setMaterialDrafts((prev) => ({
      ...prev,
      [key]: {
        id: createId(),
        title: "",
        type: "link",
        url: "",
        fileName: "",
      },
    }));
  };

  // Save overview (description, outcomes, thumbnail, books) to backend
  const handleSaveOverview = async () => {
    if (!courseId) {
      toast({
        title: "Error",
        description: "Missing course ID from URL",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSavingMaterial(true);

      // Frontend validation: ensure required fields are present
      const title = selectedClass.name?.trim() ?? "";
      const description = courseDescription?.trim() ?? "";
      if (!title) {
        toast({ title: "Validation", description: "Course title is missing.", variant: "destructive" });
        setIsSavingMaterial(false);
        return;
      }
      if (!description) {
        toast({ title: "Validation", description: "Please enter a course description.", variant: "destructive" });
        setIsSavingMaterial(false);
        return;
      }

      let thumbnailPublicId = "";
      let thumbnailUrl = "";

      // Upload thumbnail if file was selected
      if (thumbnailFileName) {
        const input = document.getElementById("thumbnail-file-input") as HTMLInputElement;
        const file = input?.files?.[0];
        if (file) {
          try {
            const uploadResponse = await uploadFileToCloudinary(
              file,
              `courses/${decodeURIComponent(courseId)}/thumbnail`
            );
            thumbnailPublicId = uploadResponse.publicId;
            thumbnailUrl = uploadResponse.secureUrl;
          } catch (uploadError) {
            toast({
              title: "Thumbnail Upload Failed",
              description: `Error: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
              variant: "destructive",
            });
            setIsSavingMaterial(false);
            return;
          }
        }
      }

      // Process recommended books - upload files and get publicIds
      const processedBooks = await Promise.all(
        books.map(async (book) => {
          let bookUrl = "";

          if (book.fileObject) {
            try {
              const uploadResponse = await uploadFileToCloudinary(
                book.fileObject,
                `courses/${decodeURIComponent(courseId)}/books`
              );
              bookUrl = uploadResponse.secureUrl;
            } catch (uploadError) {
              // Log but continue with other books
              console.warn(`Failed to upload book file ${book.fileName}:`, uploadError);
            }
          }

          return {
            title: book.title,
            author: book.author,
            fileUrl: bookUrl,
          };
        })
      );

      const overviewPayload = {
        title: selectedClass.name,
        description: courseDescription,
        learningOutcome: learningOutcomes.trim(),
        objectives: [],
        thumbnailUrl,
        thumbnailPublicId,
        recommendedBooks: processedBooks,
        chapters: chapters.map((c) => ({
          id: c.id,
          chapterName: c.name,
          description: c.description,
          topics: (c.topics || []).map((t) => ({ id: t.id, topicName: t.name })),
        })),
      };

      if (onSaveOverview) {
        await onSaveOverview(overviewPayload);
      } else {
        const payload = {
          title: selectedClass.name,
          description: courseDescription,
          learningOutcome: learningOutcomes.trim(),
          thumbnailUrl,
          thumbnailPublicId,
          objectives: [],
          recommendedBooks: processedBooks,
          classId: classId ? decodeURIComponent(classId) : decodeURIComponent(courseId),
          subjectId: decodeURIComponent(courseId),
        };

        // Try PATCH first (for updates), fallback to POST (for creation)
        try {
          await apiAuthRequest(`/materials/course/${encodeURIComponent(courseId)}/overview`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch (patchError) {
          // If PATCH fails (e.g., 404 - overview doesn't exist), try POST
          if (patchError instanceof Error && patchError.message.includes('404')) {
            await apiAuthRequest(`/materials/course/${encodeURIComponent(courseId)}/overview`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });
          } else {
            throw patchError;
          }
        }
      }

      toast({
        title: "Success",
        description: "Course overview saved successfully",
      });

      setBooks(
        processedBooks.map((book) => ({
          id: createId(),
          title: book.title,
          author: book.author,
          fileName: book.fileUrl ? book.fileUrl.split('/').pop() || book.fileUrl : undefined,
          publicId: undefined,
          url: book.fileUrl,
        })),
      );

      // Reset thumbnail file input
      const thumbnailInput = document.getElementById("thumbnail-file-input") as HTMLInputElement;
      if (thumbnailInput) {
        thumbnailInput.value = "";
      }
      setThumbnailFileName("");
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save overview: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
    } finally {
      setIsSavingMaterial(false);
    }
  };

  // Save material to backend
  const handleSaveMaterial = async (material: {
    title: string;
    type: StudyMaterial["type"];
    url: string;
    fileName?: string;
    fileObject?: File;
    chapterId?: string;
    topicId?: string;
  }): Promise<any | null> => {
    if (!courseId) {
      toast({
        title: "Error",
        description: "Missing course ID from URL",
        variant: "destructive",
      });
      return null;
    }

    try {
      setIsSavingMaterial(true);

      if (!classId) {
        toast({
          title: "Error",
          description: "Missing class ID from URL",
          variant: "destructive",
        });
        return null;
      }

      let persistentCourseId = courseData?.id;
      if (!persistentCourseId) {
        const ensured = await ensureCourseByClassAndSubject(
          decodeURIComponent(classId),
          decodeURIComponent(courseId),
          selectedClass.name || "Course",
        );
        setCourseData(ensured);
        persistentCourseId = ensured.id;
      }

      // Upload file to Cloudinary if present
      let publicId = "";
      let fileMetadata: {
        resourceType?: "image" | "video" | "raw" | "auto";
        originalFileName?: string;
        mimeType?: string;
        sizeBytes?: number;
      } = {};
      if (material.fileObject) {
        try {
          const uploadResponse = await uploadFileToCloudinary(
            material.fileObject,
            `courses/materials/${decodeURIComponent(courseId)}`
          );
          publicId = uploadResponse.publicId;
          fileMetadata = {
            resourceType: uploadResponse.resourceType,
            originalFileName: material.fileObject.name,
            mimeType: material.fileObject.type,
            sizeBytes: material.fileObject.size,
          };
        } catch (uploadError) {
          toast({
            title: "Upload Failed",
            description: `File upload error: ${uploadError instanceof Error ? uploadError.message : "Unknown error"}`,
            variant: "destructive",
          });
          setIsSavingMaterial(false);
          return;
        }
      }

      // Create material record on backend
      const payload = {
        courseId: persistentCourseId,
        classId: decodeURIComponent(classId),
        subjectId: decodeURIComponent(courseId),
        scope: "material",
        title: material.title,
        type: material.type,
        url: material.url,
        publicId: publicId,
        description: material.title,
        learningOutcome: material.title,
        chapterId: material.chapterId,
        topicId: material.topicId,
        teacherId: loadAuthSession()?.user.id,
        ...fileMetadata,
      };

      const response = await apiAuthRequest<any>(`/materials/course/${encodeURIComponent(persistentCourseId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      toast({
        title: "Success",
        description: "Material saved successfully",
      });

      return response;
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save material: ${error instanceof Error ? error.message : "Unknown error"}`,
        variant: "destructive",
      });
      return null;
    } finally {
      setIsSavingMaterial(false);
    }
  };

  const flatMaterials = useMemo(() => {
    const allMaterials: (StudyMaterial & { location: string })[] = [];
    if (selectedClass.materials) {
      selectedClass.materials.forEach((m) => allMaterials.push({ ...m, location: "Course" }));
    }
    chapters.forEach((ch) => {
      ch.materials?.forEach((m) => allMaterials.push({ ...m, location: `Chapter: ${ch.name}` }));
      ch.topics?.forEach((t) => {
        t.materials?.forEach((m) => {
          allMaterials.push({ ...m, location: `${ch.name} > ${t.name}` });
        });
      });
    });
    return allMaterials;
  }, [selectedClass.materials, chapters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "overview"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <BookOpen className="h-4 w-4" /> Overview
        </button>
        <button
          onClick={() => setActiveTab("chapters")}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
            activeTab === "chapters"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
          }`}
        >
          <Library className="h-4 w-4" /> Chapters & Topics
        </button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Course Overview</h3>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Course Description</label>
              <textarea
                value={courseDescription}
                onChange={(e) => setCourseDescription(e.target.value)}
                placeholder="Write course description for students..."
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Learning Outcomes</label>
              <textarea
                value={learningOutcomes}
                onChange={(e) => setLearningOutcomes(e.target.value)}
                placeholder="One outcome per line"
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wide text-muted-foreground">Upload Thumbnail</label>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => thumbnailInputRef.current?.click()}
                    className="h-11 inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm text-foreground hover:border-primary/40"
                  >
                    <ImagePlus className="h-4 w-4" /> Pick Thumbnail File
                  </button>
                  <p className="text-xs text-muted-foreground truncate">
                    {thumbnailFileName || "No image selected"}
                  </p>
                  <input
                    id="thumbnail-file-input"
                    ref={thumbnailInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => setThumbnailFileName(e.target.files?.[0]?.name || "")}
                  />
                </div>
            </div>

            <button
              onClick={handleSaveOverview}
              disabled={isSavingMaterial}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingMaterial && <Loader2 className="h-4 w-4 animate-spin" />}
              {isSavingMaterial ? "Saving Overview..." : "Save Overview"}
            </button>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-4">
            <h3 className="text-base font-semibold text-foreground">Recommended Books</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={bookTitle}
                onChange={(e) => setBookTitle(e.target.value)}
                placeholder="Book title"
                className="h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground"
              />
              <input
                value={bookAuthor}
                onChange={(e) => setBookAuthor(e.target.value)}
                placeholder="Author"
                className="h-11 rounded-xl border border-border bg-background px-4 text-sm text-foreground"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <button
                type="button"
                onClick={() => bookInputRef.current?.click()}
                className="h-10 inline-flex items-center gap-2 rounded-lg border border-border px-3 text-sm text-foreground hover:border-primary/40"
              >
                <UploadCloud className="h-4 w-4" /> Pick Book File
              </button>
              <p className="text-xs text-muted-foreground truncate">
                {bookFileName || "No file selected"}
              </p>
              <input
                id="book-file-input"
                ref={bookInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setBookFileName(e.target.files?.[0]?.name || "")}
              />
            </div>
            <button
              onClick={handleAddBook}
              className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" /> Add Book
            </button>

            <button
              onClick={handlePatchBooksAfterOverview}
              disabled={books.length === 0 || isSavingMaterial}
              className="ml-2 inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSavingMaterial ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Save Books
            </button>

            {books.length > 0 ? (
              <div className="space-y-2">
                {books.map((book) => (
                  <div key={book.id} className="rounded-lg border border-border bg-background p-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{book.title}</p>
                      <p className="text-xs text-muted-foreground">{book.author || "Unknown author"}</p>
                    {book.fileName ? (
                      <p className="text-[11px] text-muted-foreground mt-1">Attachment: {book.fileName}</p>
                    ) : null}
                    </div>
                    <button
                      onClick={() => handleDeleteBook(book.id)}
                      className="text-rose-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No recommended books added yet.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === "chapters" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-border/60 bg-muted/10 p-4 space-y-3">
            <h3 className="text-base font-semibold text-foreground">Add Chapter</h3>
            <input
              value={chapterName}
              onChange={(e) => setChapterName(e.target.value)}
              placeholder="Chapter name"
              className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground"
            />
            <textarea
              value={chapterDescription}
              onChange={(e) => setChapterDescription(e.target.value)}
              placeholder="Short chapter description"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              rows={3}
            />
            <textarea
              value={chapterOutcomes}
              onChange={(e) => setChapterOutcomes(e.target.value)}
              placeholder="Chapter learning outcomes (one per line)"
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              rows={3}
            />
            <button
              onClick={handleAddChapter}
              className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10"
            >
              <Plus className="h-4 w-4" /> Add Chapter
            </button>
          </div>

          {chapters.length === 0 ? (
            <p className="text-sm text-muted-foreground">No chapters added yet.</p>
          ) : (
            <div className="space-y-4">
              {chapters.map((chapter, chapterIndex) => (
                <div key={chapter.id} className="rounded-xl border border-border/60 bg-card p-4 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-base font-semibold text-foreground">
                        Chapter {chapterIndex + 1}: {chapter.name}
                      </h4>
                      {chapter.description ? (
                        <p className="text-sm text-muted-foreground mt-1">{chapter.description}</p>
                      ) : null}
                    </div>
                    <button
                      onClick={() => setChapters((prev) => prev.filter((item) => item.id !== chapter.id))}
                      className="text-rose-500 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="rounded-lg border border-border/50 bg-muted/10 p-3 space-y-2">
                    <label className="text-xs uppercase tracking-wide text-muted-foreground">Add Topic</label>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        value={topicInputs[chapter.id] || ""}
                        onChange={(e) =>
                          setTopicInputs((prev) => ({
                            ...prev,
                            [chapter.id]: e.target.value,
                          }))
                        }
                        placeholder="Topic name"
                        className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                      />
                      <button
                        onClick={() => handleAddTopic(chapter.id)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10"
                      >
                        <Plus className="h-4 w-4" /> Add Topic
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {chapter.topics.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No topics added yet.</p>
                    ) : (
                      chapter.topics.map((topic) => {
                        const key = `${chapter.id}:${topic.id}`;
                        const draft = materialDrafts[key] || {
                          id: createId(),
                          title: "",
                          type: "link" as StudyMaterial["type"],
                          url: "",
                          fileName: "",
                        };

                        return (
                          <div key={topic.id} className="rounded-lg border border-border/50 bg-muted/5 p-3 space-y-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-foreground">{topic.name}</p>
                              <button
                                onClick={() =>
                                  setChapters((prev) =>
                                    prev.map((ch) =>
                                      ch.id === chapter.id
                                        ? {
                                            ...ch,
                                            topics: ch.topics.filter((tp) => tp.id !== topic.id),
                                          }
                                        : ch,
                                    ),
                                  )
                                }
                                className="text-rose-500 hover:text-rose-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                              <input
                                value={draft.title}
                                onChange={(e) =>
                                  setMaterialDrafts((prev) => ({
                                    ...prev,
                                    [key]: { ...draft, title: e.target.value },
                                  }))
                                }
                                placeholder="Material title"
                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                              />
                              <select
                                value={draft.type}
                                onChange={(e) =>
                                  setMaterialDrafts((prev) => ({
                                    ...prev,
                                    [key]: {
                                      ...draft,
                                      type: e.target.value as StudyMaterial["type"],
                                    },
                                  }))
                                }
                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                              >
                                {MATERIAL_TYPES.map((matType) => (
                                  <option key={matType} value={matType}>
                                    {matType.toUpperCase()}
                                  </option>
                                ))}
                              </select>
                              <input
                                value={draft.url}
                                onChange={(e) =>
                                  setMaterialDrafts((prev) => ({
                                    ...prev,
                                    [key]: { ...draft, url: e.target.value },
                                  }))
                                }
                                placeholder="URL (optional)"
                                className="h-10 rounded-lg border border-border bg-background px-3 text-sm text-foreground"
                              />
                              <label className="h-10 rounded-lg border border-dashed border-border bg-background px-3 text-xs text-muted-foreground flex items-center gap-2 cursor-pointer">
                                <UploadCloud className="h-4 w-4" />
                                <span className="truncate">{draft.fileName || "Upload file"}</span>
                                <input
                                  id={`topic-material-file-${key}`}
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    setMaterialDrafts((prev) => ({
                                      ...prev,
                                      [key]: {
                                        ...draft,
                                        fileName: e.target.files?.[0]?.name || "",
                                      },
                                    }))
                                  }
                                />
                              </label>
                            </div>

                            <button
                              onClick={() => handleAddTopicMaterial(chapter.id, topic.id)}
                              disabled={isSavingMaterial}
                              className="inline-flex items-center gap-2 rounded-lg border border-primary px-3 py-2 text-sm text-primary hover:bg-primary/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isSavingMaterial && <Loader2 className="h-4 w-4 animate-spin" />}
                              <Plus className="h-4 w-4" /> {isSavingMaterial ? "Saving..." : "Add Topic Material"}
                            </button>

                            {topic.materials.length > 0 ? (
                              <div className="space-y-2">
                                {topic.materials.map((mat) => {
                                  const Icon = materialIcon(mat.type);
                                  return (
                                    <div key={mat.id} className="rounded-lg border border-border/50 bg-background p-2 flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <Icon className="h-4 w-4 text-primary" />
                                        <p className="text-sm text-foreground truncate">{mat.title}</p>
                                      </div>
                                      <button
                                        onClick={() =>
                                          setChapters((prev) =>
                                            prev.map((ch) =>
                                              ch.id === chapter.id
                                                ? {
                                                    ...ch,
                                                    topics: ch.topics.map((tp) =>
                                                      tp.id === topic.id
                                                        ? {
                                                            ...tp,
                                                            materials: tp.materials.filter((m) => m.id !== mat.id),
                                                          }
                                                        : tp,
                                                    ),
                                                  }
                                                : ch,
                                            ),
                                          )
                                        }
                                        className="text-rose-500 hover:text-rose-400"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : null}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border/60 bg-muted/10 p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-base font-semibold text-foreground">Published Materials</h3>
        </div>

        {flatMaterials.length > 0 ? (
          <div className="space-y-2">
            {flatMaterials.map((mat, idx) => {
              const Icon = materialIcon(mat.type);
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-background rounded-lg border border-border/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <Icon className="h-4 w-4 text-primary" />
                    <div className="min-w-0">
                      {editingMaterialId === String(mat.id) ? (
                        <div className="flex flex-col">
                          <input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="text-sm text-foreground w-full rounded-md border border-border px-2 py-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{mat.location}</p>
                          <div className="mt-2 flex gap-2">
                            <select
                              value={editChapterId ?? ''}
                              onChange={(e) => setEditChapterId(e.target.value || null)}
                              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                            >
                              <option value="">Select chapter</option>
                              {chapters.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  {ch.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={editTopicId ?? ''}
                              onChange={(e) => setEditTopicId(e.target.value || null)}
                              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                            >
                              <option value="">Select topic</option>
                              {chapters
                                .find((c) => c.id === editChapterId)
                                ?.topics.map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm text-foreground truncate">{mat.title}</p>
                          <p className="text-xs text-muted-foreground">{mat.location}</p>
                        </>
                      )}
                    </div>
                  </div>
                    <div className="flex items-center gap-3">
                    {mat.url ? (
                      <a
                        href={mat.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm"
                      >
                        View
                      </a>
                    ) : null}
                    {editingMaterialId === String(mat.id) ? (
                      <>
                        <input
                          id={`edit-file-${mat.id}`}
                          ref={editFileInputRef}
                          type="file"
                          className="hidden"
                        />
                        <button
                          onClick={async () => {
                            if (!courseId) return;
                            setIsSavingMaterial(true);
                            try {
                              let publicId = undefined;
                              let fileUrl = undefined;
                              const file = (document.getElementById(`edit-file-${mat.id}`) as HTMLInputElement)?.files?.[0];
                              if (file) {
                                const uploadResp = await uploadFileToCloudinary(file, `courses/${decodeURIComponent(courseId)}/materials`);
                                publicId = uploadResp.publicId;
                                fileUrl = uploadResp.secureUrl;
                              }

                              const patchPayload: any = { title: editTitle };
                              if (fileUrl) patchPayload.url = fileUrl;
                              if (publicId) patchPayload.publicId = publicId;
                              if (editChapterId !== null) patchPayload.chapterId = editChapterId;
                              if (editTopicId !== null) patchPayload.topicId = editTopicId;

                              await apiAuthRequest(`/materials/${mat.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(patchPayload),
                              });

                              // Update local UI: remove from previous topic and insert into target topic
                              setChapters((prev) => {
                                const next = JSON.parse(JSON.stringify(prev)) as ChapterDraft[];
                                let removed: TopicMaterialDraft | null = null;
                                for (const ch of next) {
                                  for (const tp of ch.topics) {
                                    const idx = tp.materials.findIndex((m) => m.id === String(mat.id));
                                    if (idx !== -1) {
                                      removed = tp.materials.splice(idx, 1)[0];
                                      break;
                                    }
                                  }
                                  if (removed) break;
                                }

                                const updatedMaterial: TopicMaterialDraft = removed ?? {
                                  id: String(mat.id),
                                  title: editTitle,
                                  type: (mat as any).type ?? 'other',
                                  url: patchPayload.url ?? (mat as any).url ?? '',
                                  fileName: (mat as any).fileName ?? '',
                                  publicId: patchPayload.publicId ?? (mat as any).publicId,
                                };
                                updatedMaterial.title = editTitle;

                                if (editChapterId && editTopicId) {
                                  const destCh = next.find((c) => c.id === editChapterId);
                                  if (destCh) {
                                    const destTp = destCh.topics.find((t) => t.id === editTopicId);
                                    if (destTp) {
                                      destTp.materials = destTp.materials || [];
                                      if (!destTp.materials.find((m) => m.id === updatedMaterial.id)) {
                                        destTp.materials.push(updatedMaterial);
                                      }
                                    }
                                  }
                                } else if (removed) {
                                  // no destination selected: put back to first chapter/topic
                                  const first = next[0];
                                  if (first && first.topics[0]) first.topics[0].materials.push(updatedMaterial);
                                }

                                return next;
                              });

                              setEditingMaterialId(null);
                              toast({ title: 'Success', description: 'Material updated.' });
                            } catch (err) {
                              toast({ title: 'Error', description: 'Failed to update material', variant: 'destructive' });
                            } finally {
                              setIsSavingMaterial(false);
                            }
                          }}
                          className="text-sm text-primary hover:underline"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingMaterialId(null);
                          }}
                          className="text-sm text-muted-foreground hover:underline ml-2"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        {onRemoveMaterial ? (
                          <button
                            onClick={() => onRemoveMaterial(String(mat.id))}
                            className="text-sm text-rose-500 hover:underline"
                          >
                            Remove
                          </button>
                        ) : null}
                        <button
                          onClick={() => {
                            setEditingMaterialId(String(mat.id));
                            setEditTitle(mat.title);
                          }}
                          className="text-sm text-muted-foreground hover:underline ml-2"
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No materials added yet.</p>
        )}
      </div>
    </div>
  );
};

export default MaterialsTab;
