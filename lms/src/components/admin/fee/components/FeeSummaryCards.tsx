type Props = {
  pendingCount: number;
  totalPending: number;
  totalStudents: number;
  onShowPendingOnly?: () => void;
};

const FeeSummaryCards = ({
  pendingCount,
  totalPending,
  totalStudents,
  onShowPendingOnly,
}: Props) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
      <button
        type="button"
        onClick={onShowPendingOnly}
        className="stat-card card-hover text-left hover:scale-[1.01]"
      >
        <div>
          <p className="stat-label">Students With Pending Fee</p>
          <p className="stat-value text-destructive">{pendingCount}</p>
        </div>
      </button>
      <div className="stat-card">
        <div>
          <p className="stat-label">Total Pending</p>
          <p className="stat-value">Rs. {totalPending.toLocaleString()}</p>
        </div>
      </div>
      <div className="stat-card">
        <div>
          <p className="stat-label">Total Students</p>
          <p className="stat-value">{totalStudents}</p>
        </div>
      </div>
    </div>
  );
};

export default FeeSummaryCards;
