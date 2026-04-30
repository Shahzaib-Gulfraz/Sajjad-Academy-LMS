import type { Course, StudyMaterial } from "@/types/domain";
import { materialIcon } from "../classUtils";

interface Props {
  selectedClass: Course;
}

const MaterialsTab = ({ selectedClass }: Props) => {
  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mb-4">All Study Materials</h3>
      {(() => {
        const allMaterials: (StudyMaterial & { location: string })[] = [];
        if (selectedClass.materials) {
          selectedClass.materials.forEach((m) => allMaterials.push({ ...m, location: "Course" }));
        }
        selectedClass.chapters?.forEach((ch) => {
          ch.materials?.forEach((m) => allMaterials.push({ ...m, location: `Ch ${ch.chapterNumber}` }));
          ch.topics?.forEach((t) => {
            t.materials?.forEach((m) =>
              allMaterials.push({ ...m, location: `${ch.chapterNumber}.${t.topicName}` }),
            );
          });
        });

        return allMaterials.length > 0 ? (
          <div className="space-y-2">
            {allMaterials.map((mat, idx) => {
              const Icon = materialIcon(mat.type);
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-sm text-foreground">{mat.title}</p>
                      <p className="text-xs text-muted-foreground">{mat.location}</p>
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
          <p className="text-sm text-muted-foreground">No materials added yet.</p>
        );
      })()}
    </div>
  );
};

export default MaterialsTab;
