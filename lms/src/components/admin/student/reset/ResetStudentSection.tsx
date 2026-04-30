import { KeyRound } from "lucide-react";

interface Props {
  resetId: string;
  onResetIdChange: (value: string) => void;
  onReset: () => void;
}

const ResetStudentSection = ({ resetId, onResetIdChange, onReset }: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-warning" />
        <h2 className="text-lg font-semibold">Reset Password</h2>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={resetId}
          onChange={(e) => onResetIdChange(e.target.value)}
          placeholder="Enter Student ID"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
        />
        <button onClick={onReset} className="rounded-lg bg-warning px-4 py-2 text-white">
          Reset Password
        </button>
      </div>

      <p className="text-sm text-muted-foreground">
        Enter the student portal ID like Stu-0001. Default password after reset is the same student ID.
      </p>
    </div>
  );
};

export default ResetStudentSection;
