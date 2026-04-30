import type { Student } from "@/types/domain";
import { getEnrolledCourses, studentCode } from "../utils/feeUtils";

type Props = {
  student: Student;
};

const StudentOverviewCard = ({ student }: Props) => {
  const statusBadgeClass =
    student.fees.status === "Paid"
      ? "badge-success"
      : student.fees.status === "Partial"
      ? "badge-warning"
      : "badge-destructive";

  return (
    <div className="card card-elevated p-5 space-y-4 animate-slide-up">
      <div>
        <h2 className="text-lg font-semibold text-foreground">{student.name}</h2>
        <p className="text-sm text-muted-foreground">
          {studentCode(student.id)} | {student.grade}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="stat-card p-3 block">
          <p className="text-xs text-muted-foreground">Fee Status</p>
          <span className={`badge ${statusBadgeClass}`}>{student.fees.status}</span>
        </div>
        <div className="stat-card p-3 block">
          <p className="text-xs text-muted-foreground">Class</p>
          <p className="font-semibold text-foreground">{student.grade}</p>
        </div>
        <div className="stat-card p-3 block">
          <p className="text-xs text-muted-foreground">Pending</p>
          <p
            className={`font-semibold ${
              student.fees.pending > 0 ? "text-destructive" : "text-success"
            }`}
          >
            Rs. {student.fees.pending.toLocaleString()}
          </p>
        </div>
        <div className="stat-card p-3 block">
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="font-semibold text-foreground">
            Rs. {student.fees.paid.toLocaleString()}
          </p>
        </div>
      </div>

      <div>
        <p className="text-xs text-muted-foreground mb-2">Enrolled Courses</p>
        <div className="flex flex-wrap gap-2">
          {getEnrolledCourses(student).length > 0 ? (
            getEnrolledCourses(student).map((course) => (
              <span
                key={course}
                className="badge badge-info"
              >
                {course}
              </span>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No courses available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentOverviewCard;
