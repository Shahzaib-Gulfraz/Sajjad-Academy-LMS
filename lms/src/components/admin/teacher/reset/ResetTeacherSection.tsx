import { KeyRound } from "lucide-react";

interface Props {
  resetId: string;
  onResetIdChange: (value: string) => void;
  onReset: () => void;
}

const ResetTeacherSection = ({ resetId, onResetIdChange, onReset }: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-4 max-w-xl">
      <div className="flex items-center gap-2">
        <KeyRound className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">Reset Teacher Password</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        Enter the teacher portal ID like Ta-0001. Default password after reset is the same teacher ID.
      </p>
      <div className="flex gap-2">
        <input
          value={resetId}
          onChange={(e) => onResetIdChange(e.target.value)}
          placeholder="Teacher ID"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          onClick={onReset}
          className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Reset
        </button>
      </div>
    </div>
  );
};

export default ResetTeacherSection;
