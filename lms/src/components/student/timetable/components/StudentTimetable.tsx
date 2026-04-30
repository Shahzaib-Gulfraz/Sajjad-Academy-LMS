import { useState, useMemo } from "react";
import { Filter, Calendar, Clock, BookOpen, AlertCircle } from "lucide-react";
import { useTimetable } from "../hooks/useTimetable";

const StudentTimetable = () => {
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const { timetable, isLoading } = useTimetable();

  const daysOfWeek = [
    { key: "mon", label: "Mon" },
    { key: "tue", label: "Tue" },
    { key: "wed", label: "Wed" },
    { key: "thu", label: "Thu" },
    { key: "fri", label: "Fri" },
    { key: "sat", label: "Sat" },
  ] as const;

  // Extract unique courses (subjects) from timetable
  const courses = useMemo(() => {
    const courseSet = new Set<string>();
    timetable.forEach((row) => {
      daysOfWeek.forEach(({ key }) => {
        const cell = row[key as keyof typeof row];
        if (cell && cell !== "BREAK") {
          courseSet.add(cell as string);
        }
      });
    });
    return Array.from(courseSet).sort();
  }, [timetable]);

  // Extract date ranges for each course
  const courseRanges = useMemo(() => {
    const ranges = new Map<string, { startDate?: string; endDate?: string }>();
    timetable.forEach((row) => {
      if (row.dateRanges) {
        row.dateRanges.forEach((range, subject) => {
          if (subject && subject !== "BREAK") {
            ranges.set(subject, range);
          }
        });
      }
    });
    return ranges;
  }, [timetable]);

  // Determine which days have content
  const daysWithContent = useMemo(() => {
    const daysSet = new Set<string>();
    timetable.forEach((row) => {
      daysOfWeek.forEach(({ key, label }) => {
        const cell = row[key as keyof typeof row];
        if (cell) {
          daysSet.add(label);
        }
      });
    });
    return daysSet;
  }, [timetable]);

  // Check if a course is currently active (within date range)
  const isCourseDateRangeActive = (course: string): boolean => {
    const range = courseRanges.get(course);
    if (!range || (!range.startDate && !range.endDate)) return true;
    
    const today = new Date().toISOString().slice(0, 10);
    if (range.startDate && today < range.startDate) return false;
    if (range.endDate && today > range.endDate) return false;
    return true;
  };

  // Filter rows based on selected course
  const filteredRows = useMemo(() => {
    if (!selectedCourse) return timetable;
    return timetable.filter((row) =>
      daysOfWeek.some((day) => {
        const cell = row[day.key as keyof typeof row];
        return cell === selectedCourse;
      }),
    );
  }, [selectedCourse, timetable]);

  // Format date for display
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { 
      month: "short", 
      day: "numeric"
    });
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Calendar className="h-7 w-7 text-primary" /> My Timetable
          </h1>
        </div>
        {courses.length > 0 && (
          <div className="flex items-center gap-2 bg-card border border-border/60 rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="bg-transparent text-sm font-medium text-foreground focus:outline-none pr-4 cursor-pointer"
              aria-label="Filter by course"
            >
              <option value="">All Courses</option>
              {courses.map((course) => {
                const isActive = isCourseDateRangeActive(course);
                return (
                  <option key={course} value={course}>
                    {course} {isActive ? "✓" : "✗"}
                  </option>
                );
              })}
            </select>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="rounded-xl border border-border/60 bg-card/50 p-4 text-sm text-muted-foreground flex items-center gap-2">
          <span className="spinner h-4 w-4" />
          Loading timetable...
        </div>
      )}

      {/* Course Cards - Compact */}
      {!isLoading && courses.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {courses.map((course) => {
            const range = courseRanges.get(course);
            const isActive = isCourseDateRangeActive(course);
            return (
              <div
                key={course}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted/20 text-muted-foreground border border-muted/30"
                }`}
                title={range?.startDate ? `${formatDate(range.startDate)} to ${formatDate(range.endDate)}` : ""}
              >
                <span className={`h-2 w-2 rounded-full ${isActive ? "bg-green-500" : "bg-muted-foreground"}`} />
                {course}
              </div>
            );
          })}
        </div>
      )}

      {/* Timetable Table - Only Days with Content */}
      {!isLoading && filteredRows.length > 0 && (
        <div className="rounded-lg bg-card border border-border/60 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/80 bg-muted/20">
                  <th className="sticky left-0 bg-muted/20 px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <Clock className="h-4 w-4 inline mr-2" />Time
                  </th>
                  {daysOfWeek
                    .filter(({ label }) => daysWithContent.has(label))
                    .map(({ label }) => (
                      <th
                        key={label}
                        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider text-center"
                      >
                        {label}
                      </th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {filteredRows.map((row, i) => {
                  const cellValues = daysOfWeek.map(({ key }) => row[key as keyof typeof row]);
                  const isBreak = cellValues.some((cell) => cell === "BREAK");

                  return (
                    <tr
                      key={i}
                      className={`transition-colors ${
                        isBreak
                          ? "bg-warning/5 hover:bg-warning/10"
                          : "hover:bg-muted/10"
                      }`}
                    >
                      <td className="sticky left-0 bg-card px-4 py-3 font-semibold text-foreground border-r border-border/20">
                        {row.time}
                      </td>
                      {daysOfWeek
                        .filter(({ label }) => daysWithContent.has(label))
                        .map(({ key, label }) => {
                          const cell = row[key as keyof typeof row];
                          const isMatchingCourse = selectedCourse && cell === selectedCourse;
                          const isInactive = cell && !isCourseDateRangeActive(cell as string);

                          let cellContent = cell || "—";
                          let cellClasses = "px-4 py-3 text-center transition-all";

                          if (cell === "BREAK") {
                            cellClasses += " font-semibold text-warning";
                          } else if (isMatchingCourse) {
                            cellClasses += " bg-primary/20 font-semibold text-primary rounded";
                          } else if (cell) {
                            cellClasses += isInactive
                              ? " text-muted-foreground line-through opacity-50"
                              : " text-foreground font-medium";
                          } else {
                            cellClasses += " text-muted-foreground/40";
                          }

                          return (
                            <td
                              key={label}
                              className={cellClasses}
                              title={isInactive ? `${cell} is not active` : ""}
                            >
                              {cellContent}
                              {isInactive && (
                                <AlertCircle className="h-3 w-3 inline ml-1 text-warning" />
                              )}
                            </td>
                          );
                        })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredRows.length === 0 && (
        <div className="rounded-lg border border-border/40 bg-card/50 p-12 text-center">
          <BookOpen className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">
            {selectedCourse
              ? `No classes for ${selectedCourse} this week`
              : "No classes scheduled for this week"}
          </p>
        </div>
      )}

      {/* Selection Indicator */}
      {selectedCourse && filteredRows.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-1">
          Showing <span className="font-medium text-primary">{selectedCourse}</span> only
        </div>
      )}
    </div>
  );
};

export default StudentTimetable;