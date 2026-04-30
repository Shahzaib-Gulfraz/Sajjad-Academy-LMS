import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Eye } from "lucide-react";
import type { Student, Teacher } from "@/types/domain";
import { gradeColor } from "../classUtils";
import { percentageToCambridgeGrade } from "@/lib/grades";

interface Props {
  classStudents: Student[];
  teacher: Teacher;
  expandedStudentId: number | null;
  onToggleStudent: (studentId: number) => void;
}

const StudentsSection = ({ classStudents, teacher, expandedStudentId, onToggleStudent }: Props) => {
  const [visibleCount, setVisibleCount] = useState(20);

  useEffect(() => {
    setVisibleCount(20);
  }, [classStudents.length]);

  const visibleStudents = classStudents.slice(0, visibleCount);

  return (
    <div>
      <h3 className="text-lg font-semibold text-foreground mt-8 mb-4">Students in this Class</h3>
      <div className="space-y-3">
        {visibleStudents.map((s) => {
          const subTests = s.tests.filter((t) => t.subject === teacher.subject);
          const avg =
            subTests.length > 0
              ? subTests.reduce((a, t) => a + (t.marks / t.total) * 100, 0) / subTests.length
              : 0;
          const avgGrade = percentageToCambridgeGrade(avg);
          const subjectAssignments = s.assignments.filter((a) => a.subject === teacher.subject);
          const isExpanded = expandedStudentId === s.id;

          return (
            <div key={s.id} className="bg-card border border-border rounded-xl overflow-hidden">
              <div
                onClick={() => onToggleStudent(s.id)}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {s.avatar}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      ID: STU-{String(s.id).padStart(4, "0")} - Grade: {s.grade}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span
                      className={`text-sm font-bold ${gradeColor(avgGrade)}`}
                    >
                      {avg.toFixed(0)}% Avg · {avgGrade}
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border p-4 bg-muted/10">
                  <h4 className="font-semibold text-foreground mb-3">Tests & Quizzes</h4>
                  {subTests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No tests recorded.</p>
                  ) : (
                    <div className="overflow-x-auto mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/30">
                          <tr>
                            <th className="text-left p-2">Test</th>
                            <th className="text-left p-2">Marks</th>
                            <th className="text-left p-2">Total</th>
                            <th className="text-left p-2">%</th>
                            <th className="text-left p-2">Grade</th>
                            <th className="text-left p-2">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {subTests.map((test, idx) => (
                            <tr key={idx} className="border-b border-border">
                              <td className="p-2 font-medium">{test.test}</td>
                              <td className="p-2">{test.marks}</td>
                              <td className="p-2">{test.total}</td>
                              {(() => {
                                const percent = (test.marks / test.total) * 100;
                                const grade = percentageToCambridgeGrade(percent);
                                return (
                                  <>
                                    <td className="p-2">{percent.toFixed(0)}%</td>
                                    <td className={`p-2 font-bold ${gradeColor(grade)}`}>
                                      {grade}
                                    </td>
                                  </>
                                );
                              })()}
                              <td className="p-2">{new Date(test.date).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <h4 className="font-semibold text-foreground mb-3">Assignments</h4>
                  {subjectAssignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No assignments for this subject.</p>
                  ) : (
                    <div className="space-y-3">
                      {subjectAssignments.map((ass, idx) => (
                        <div key={idx} className="bg-card border border-border rounded-lg p-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-foreground">{ass.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Due: {new Date(ass.due).toLocaleDateString()} - Status:
                                <span
                                  className={`ml-1 ${
                                    ass.status === "Submitted"
                                      ? "text-success"
                                      : ass.status === "Late"
                                        ? "text-destructive"
                                        : "text-warning"
                                  }`}
                                >
                                  {ass.status}
                                </span>
                              </p>
                              {ass.question && <p className="text-sm mt-1">{ass.question}</p>}
                              {ass.totalMarks && (
                                <p className="text-xs text-muted-foreground mt-1">Total Marks: {ass.totalMarks}</p>
                              )}
                              {ass.score && <p className="text-sm font-semibold mt-1">Score: {ass.score}</p>}
                            </div>
                            {ass.status === "Submitted" && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  alert(`Viewing submission for ${ass.title} (simulated PDF)`);
                                }}
                                className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                title="View Submission"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          {(ass.chapterName || ass.submissionType) && (
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                              {ass.chapterName && <span>Chapter: {ass.chapterName}</span>}
                              {ass.submissionType && <span>Submission: {ass.submissionType}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Recheck/grading for ${s.name} - feature coming soon`);
                      }}
                      className="text-sm text-primary hover:underline"
                    >
                      Grade / Recheck
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {classStudents.length > visibleCount && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisibleCount((prev) => prev + 20)}
            className="text-sm text-primary hover:underline"
          >
            Show more students
          </button>
        </div>
      )}
    </div>
  );
};

export default StudentsSection;
