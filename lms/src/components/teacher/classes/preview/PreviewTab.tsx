import type { Course } from "@/types/domain";
import { materialIcon } from "../classUtils";

interface Props {
  selectedClass: Course & {
    overviewTitle?: string;
    learningOutcomes?: string[];
    objectives?: string[];
    thumbnailUrl?: string;
    weeklySchedule?: Array<{
      id?: string;
      day: string;
      startTime: string;
      endTime: string;
      topic?: string;
      location?: string;
    }>;
  };
  studentCount: number;
}

const PreviewTab = ({ selectedClass, studentCount }: Props) => {
  const hasChapters = (selectedClass.chapters || []).length > 0;
  const hasCourseMaterials = (selectedClass.materials || []).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Overview</h3>
        {selectedClass.overviewTitle ? (
          <p className="text-sm font-medium text-foreground mb-2">{selectedClass.overviewTitle}</p>
        ) : null}
        <p className="text-xs text-muted-foreground mb-2">Students: {studentCount}</p>
        {selectedClass.thumbnailUrl ? (
          <img
            src={selectedClass.thumbnailUrl}
            alt={selectedClass.overviewTitle ?? selectedClass.name}
            className="mb-3 h-36 w-full object-cover rounded-lg border border-border"
          />
        ) : null}
        {selectedClass.description ? (
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {selectedClass.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No overview added yet.</p>
        )}

        {(selectedClass.learningOutcomes?.length || selectedClass.objectives?.length) ? (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-foreground mb-2">Learning Outcomes</p>
              {selectedClass.learningOutcomes && selectedClass.learningOutcomes.length > 0 ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {selectedClass.learningOutcomes.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No outcomes added yet.</p>
              )}
            </div>
            <div className="rounded-lg border border-border p-3">
              <p className="text-sm font-semibold text-foreground mb-2">Objectives</p>
              {selectedClass.objectives && selectedClass.objectives.length > 0 ? (
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {selectedClass.objectives.map((item, idx) => (
                    <li key={`${item}-${idx}`}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">No objectives added yet.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {selectedClass.weeklySchedule && selectedClass.weeklySchedule.length > 0 ? (
        <div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Weekly Schedule</h3>
          <div className="space-y-2">
            {selectedClass.weeklySchedule.map((slot, idx) => (
              <div key={`${slot.day}-${slot.startTime}-${idx}`} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
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

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Chapters & Topics</h3>
        {hasChapters ? (
          <div className="space-y-4">
            {selectedClass.chapters?.map((ch) => (
              <div key={ch.id} className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Chapter {ch.chapterNumber}: {ch.chapterName}
                    </p>
                    {ch.description && (
                      <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {ch.topics?.length || 0} Topics
                  </span>
                </div>

                {ch.materials && ch.materials.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-foreground mb-2">Chapter Materials</p>
                    <div className="space-y-2">
                      {ch.materials.map((mat) => {
                        const Icon = materialIcon(mat.type);
                        return (
                          <div key={mat.id} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4 text-primary" />
                              <span>{mat.title}</span>
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

                {ch.topics && ch.topics.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {ch.topics.map((topic) => (
                      <div key={topic.id} className="border border-border rounded-md p-3 bg-muted/10">
                        <p className="text-sm font-medium text-foreground">{topic.topicName}</p>
                        {topic.materials && topic.materials.length > 0 ? (
                          <div className="mt-2 space-y-2">
                            {topic.materials.map((mat) => {
                              const Icon = materialIcon(mat.type);
                              return (
                                <div key={mat.id} className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-primary" />
                                    <span>{mat.title}</span>
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
                        ) : (
                          <p className="text-xs text-muted-foreground mt-1">No materials in this topic.</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-3">No topics added yet.</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No chapters added yet.</p>
        )}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Course Materials</h3>
        {hasCourseMaterials ? (
          <div className="space-y-2">
            {selectedClass.materials?.map((mat) => {
              const Icon = materialIcon(mat.type);
              return (
                <div key={mat.id} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm text-foreground">{mat.title}</p>
                      {mat.content && (
                        <p className="text-xs text-muted-foreground">{mat.content}</p>
                      )}
                    </div>
                  </div>
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
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No course materials added yet.</p>
        )}
      </div>
    </div>
  );
};

export default PreviewTab;
