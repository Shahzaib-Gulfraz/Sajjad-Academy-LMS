type Props = {
  selectedClass: string;
  onSelectClass: (value: string) => void;
  classOptions: string[];
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  filteredCount: number;
  totalCount: number;
};

const AttendanceFilters = ({
  selectedClass,
  onSelectClass,
  classOptions,
  searchQuery,
  onSearchQueryChange,
  filteredCount,
  totalCount,
}: Props) => {
  return (
    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Select Class
        </label>
        <select
          value={selectedClass}
          onChange={(event) => onSelectClass(event.target.value)}
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {classOptions.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Search Student
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Search by name or student ID"
          className="h-11 w-full rounded-xl border border-border bg-background px-4 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <p className="text-xs text-muted-foreground">
          Showing {filteredCount} of {totalCount} students.
        </p>
      </div>
    </div>
  );
};

export default AttendanceFilters;
