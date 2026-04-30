import { useState } from "react";
import {
  BookOpen,
  ArrowLeft,
  FileText,
  User,
  Calendar,
  MapPin,
  ChevronDown,
  FolderOpen,
  GraduationCap,
  ChevronRight,
  Download,
  CheckSquare,
  Square,
} from "lucide-react";
import { useCourses, type StudyMaterial, type CourseChapter, type CourseTopic } from "../hooks/useCourses";
import { materialIcon } from "@/components/teacher/classes/classUtils";
import { SectionLoader, EmptyState } from "@/components/ui/states";

const StudentCourses = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(6);

  const { courses, isLoading, error, toggleTopicCompletion, isTogglingTopicCompletion } = useCourses();
  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const teacher = selectedCourse?.teacher ?? null;

  if (isLoading) {
    return <SectionLoader label="Loading your courses..." />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <EmptyState
          title="Unable to load courses"
          description={error}
          icon={<BookOpen className="h-6 w-6" />}
        />
      </div>
    );
  }
  if (selectedCourse) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <button
          onClick={() => setSelectedCourseId(null)}
          className="group inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 mb-6 transition-all duration-200 hover:-translate-x-1"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Back to Courses
        </button>

        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md">

          {/* Course Header - Enhanced with gradient accent */}
          <div className="relative bg-gradient-to-r from-primary/5 via-transparent to-transparent p-6 pb-4 border-b border-border/80">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground tracking-tight">
                  {selectedCourse.overviewTitle || selectedCourse.name}
                </h2>
                <p className="text-sm text-muted-foreground mt-1 font-mono">
                  {selectedCourse.code}
                </p>
              </div>
              {selectedCourse.progress !== undefined && (
                <div className="bg-primary/10 rounded-xl px-4 py-2 text-center min-w-[100px]">
                  <p className="text-2xl font-bold text-primary">{selectedCourse.progress}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              )}
            </div>
          </div>

          {/* Course Info Grid - Improved cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 pb-2">
            {selectedCourse.schedule && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 border border-border/40">
                <Calendar className="h-5 w-5 text-primary/70" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Schedule</p>
                  <p className="text-sm font-medium text-foreground">{selectedCourse.schedule}</p>
                </div>
              </div>
            )}
            {selectedCourse.room && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 border border-border/40">
                <MapPin className="h-5 w-5 text-primary/70" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Room</p>
                  <p className="text-sm font-medium text-foreground">{selectedCourse.room}</p>
                </div>
              </div>
            )}
            {teacher && (
              <div className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 border border-border/40">
                <User className="h-5 w-5 text-primary/70" />
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Instructor</p>
                  <p className="text-sm font-medium text-foreground">{teacher.name || 'N/A'}</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {selectedCourse.description && (
            <div className="px-6 pb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-primary" /> Course Description
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed bg-muted/20 rounded-xl p-4 border border-border/40">
                {selectedCourse.description}
              </p>
            </div>
          )}

          {(selectedCourse.learningOutcomes?.length || selectedCourse.objectives?.length) ? (
            <div className="px-6 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border/40 bg-muted/15 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">What You Will Learn</h3>
                {selectedCourse.learningOutcomes && selectedCourse.learningOutcomes.length > 0 ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedCourse.learningOutcomes.map((item, idx) => (
                      <li key={`${item}-${idx}`}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No outcomes shared yet.</p>
                )}
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/15 p-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Course Objectives</h3>
                {selectedCourse.objectives && selectedCourse.objectives.length > 0 ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {selectedCourse.objectives.map((item, idx) => (
                      <li key={`${item}-${idx}`}>• {item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No objectives shared yet.</p>
                )}
              </div>
            </div>
          ) : null}

          {selectedCourse.weeklySchedule && selectedCourse.weeklySchedule.length > 0 ? (
            <div className="border-t border-border/80 px-6 py-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Weekly Schedule</h3>
              <div className="space-y-2">
                {selectedCourse.weeklySchedule.map((slot, idx) => (
                  <div key={`${slot.day}-${slot.startTime}-${idx}`} className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 flex items-center justify-between gap-3">
                    <p className="text-sm text-foreground">
                      <span className="font-semibold">{slot.day}</span> · {slot.startTime} - {slot.endTime}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {slot.topic || "Lecture"}
                      {slot.location ? ` · ${slot.location}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Course Content */}
          {(selectedCourse.materials?.length || selectedCourse.chapters?.length) > 0 && (
            <div className="border-t border-border/80 px-6 py-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-5">
                <FolderOpen className="h-4 w-4 text-primary" /> Course Content
              </h3>

              {/* Course Materials */}
              {selectedCourse.materials && selectedCourse.materials.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-primary" /> 📚 Materials
                  </p>
                  <div className="space-y-2">
                    {selectedCourse.materials.map((mat) => (
                      <MaterialItem key={mat.id} material={mat} />
                    ))}
                  </div>
                </div>
              )}

              {/* Chapters & Topics */}
              {selectedCourse.chapters && selectedCourse.chapters.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" /> Chapters
                  </p>
                  <div className="space-y-3">
                    {selectedCourse.chapters.map((ch) => (
                      <ChapterCard
                        key={ch.id}
                        chapter={ch}
                        courseId={selectedCourse.id}
                        completedTopicIds={selectedCourse.completedTopicIds ?? []}
                        isUpdating={isTogglingTopicCompletion}
                        onToggleTopicCompletion={toggleTopicCompletion}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Teacher Info - Enhanced */}
          {teacher && (
            <div className="border-t border-border/80 px-6 py-5 bg-muted/10">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <User className="h-4 w-4 text-primary" /> Your Instructor
              </h3>
              <div className="rounded-xl bg-card border border-border/50 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-semibold text-foreground text-base">{teacher.name || 'N/A'}</p>
                  <p className="text-sm text-muted-foreground mt-1">{teacher.email || 'N/A'}</p>
                  {teacher.qualification && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Qualification:</span> {teacher.qualification}
                    </p>
                  )}
                  {teacher.phone && (
                    <p className="text-sm text-muted-foreground mt-1">
                      <span className="font-medium">Phone:</span> {teacher.phone}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary/70" />
                </div>
              </div>
            </div>
          )}

          {/* Past Papers - Improved styling */}
          {selectedCourse.pastPapers && selectedCourse.pastPapers.length > 0 && (
            <div className="border-t border-border/80 px-6 py-5">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-primary" /> Past Papers
              </h3>
              <div className="space-y-3">
                {selectedCourse.pastPapers.map((paper, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-xl bg-muted/20 border border-border/50 p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {paper.title} <span className="text-muted-foreground font-normal">({paper.year})</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Total Marks: {paper.totalMarks}
                      </p>
                    </div>
                    <button className="btn-secondary text-sm inline-flex items-center gap-2 self-start sm:self-center">
                      <Download className="h-3.5 w-3.5" /> Download
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="section-header mb-8 text-center sm:text-left">
        <h1 className="section-title text-2xl sm:text-3xl font-bold tracking-tight">My Courses</h1>
        <p className="section-subtitle text-muted-foreground mt-2">
          Access your enrolled courses and learning materials
        </p>
      </div>

      {courses.length === 0 && (
        <EmptyState
          title="No courses yet"
          description="Your enrolled courses will appear here once you are assigned to them."
          icon={<BookOpen className="h-6 w-6" />}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {courses.slice(0, visibleCount).map(course => (
          <button
            key={course.id}
            onClick={() => setSelectedCourseId(course.id)}
            className="group relative overflow-hidden rounded-2xl bg-card border border-border/60 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 p-5 text-left focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            {/* Animated gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="relative z-10">
              {/* Icon with enhanced styling */}
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4 group-hover:shadow-md transition-all">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>

              {/* Course Info */}
              <h3 className="font-semibold text-foreground text-base mb-1 line-clamp-1">
                {course.name}
              </h3>
              <p className="text-xs text-muted-foreground mb-4 font-mono">
                {course.code}
              </p>

              {/* Progress Bar with improved visual */}
              {course.progress !== undefined && (
                <div>
                  <div className="h-1.5 bg-muted/60 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground flex justify-between">
                    <span>Progress</span>
                    <span className="font-semibold text-primary">{course.progress}%</span>
                  </p>
                </div>
              )}
            </div>
          </button>
        ))}
      </div>

      {visibleCount < courses.length && (
        <div className="mt-10 text-center">
          <button
            onClick={() => setVisibleCount(visibleCount + 6)}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-border bg-card text-sm font-medium text-foreground hover:bg-muted/30 transition-all hover:shadow-sm"
          >
            Load More Courses <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
};

type MaterialItemProps = {
  material: StudyMaterial;
};

function MaterialItem({ material }: MaterialItemProps) {
  const Icon = materialIcon(material.type);

  return (
    <div className="group flex items-center justify-between rounded-xl bg-muted/20 border border-border/40 p-3 hover:bg-muted/30 transition-all hover:border-primary/20">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">{material.title}</p>
          {material.content && (
            <p className="text-xs text-muted-foreground truncate">{material.content}</p>
          )}
        </div>
      </div>
      {material.url && (
        <a
          href={material.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 btn-secondary text-xs whitespace-nowrap ml-2 inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          View <ChevronRight className="h-3 w-3" />
        </a>
      )}
    </div>
  );
}

type ChapterProps = {
  chapter: CourseChapter;
  courseId: string;
  onToggleTopicCompletion: (
    courseId: string,
    topicId: string,
    completed: boolean,
  ) => Promise<void>;
};

function ChapterCard({
  chapter,
  courseId,
  completedTopicIds,
  isUpdating,
  onToggleTopicCompletion,
}: ChapterProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-border/50 bg-card overflow-hidden transition-all hover:border-primary/20">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 flex items-center justify-between hover:bg-muted/20 transition-colors"
      >
        <div>
          <p className="font-semibold text-foreground text-sm">
            Chapter {chapter.chapterNumber}: {chapter.chapterName}
          </p>
          {chapter.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{chapter.description}</p>
          )}
        </div>
        <ChevronDown className={`h-4 w-4 text-primary transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-border/50 p-4 space-y-4 bg-muted/10">
          {/* Chapter Materials */}
          {chapter.materials && chapter.materials.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <FileText className="h-3 w-3 text-primary" /> Materials
              </p>
              <div className="space-y-2">
                {chapter.materials.map((mat) => (
                  <MaterialItem key={mat.id} material={mat} />
                ))}
              </div>
            </div>
          )}

          {/* Topics */}
          {chapter.topics && chapter.topics.length > 0 && (
            <div>
              <p className="text-xs font-medium text-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                <FolderOpen className="h-3 w-3 text-primary" /> Topics
              </p>
              <div className="space-y-3">
                {chapter.topics.map((topic) => (
                  <TopicItem
                    key={topic.id}
                    topic={topic}
                    courseId={courseId}
                    completedTopicIds={completedTopicIds}
                    isUpdating={isUpdating}
                    onToggleTopicCompletion={onToggleTopicCompletion}
                  />
                ))}
              </div>
            </div>
          )}

          {!chapter.materials?.length && !chapter.topics?.length && (
            <p className="text-xs text-muted-foreground italic">No content in this chapter yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

type TopicProps = {
  topic: CourseTopic;
  courseId: string;
  onToggleTopicCompletion: (
    courseId: string,
    topicId: string,
    completed: boolean,
  ) => Promise<void>;
};

function TopicItem({
  topic,
  courseId,
  completedTopicIds,
  isUpdating,
  onToggleTopicCompletion,
}: TopicProps) {
  const completed = topic.id ? completedTopicIds.includes(topic.id) : false;

  const handleToggle = async () => {
    if (!topic.id) return;
    const next = !completed;
    try {
      await onToggleTopicCompletion(courseId, topic.id, next);
    } catch {
      return;
    }
  };

  return (
    <div className="rounded-lg bg-background border border-border/40 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium text-sm text-foreground flex items-center gap-2">
          <ChevronRight className="h-3.5 w-3.5 text-primary" /> {topic.topicName}
        </p>
        {topic.id ? (
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {completed ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
            {completed ? "Completed" : "Mark Complete"}
          </button>
        ) : null}
      </div>
      {topic.materials && topic.materials.length > 0 ? (
        <div className="space-y-2">
          {topic.materials.map((mat) => (
            <MaterialItem key={mat.id} material={mat} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground pl-5">No materials in this topic.</p>
      )}
    </div>
  );
}

export default StudentCourses;