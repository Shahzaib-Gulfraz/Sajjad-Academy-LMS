import { Search } from "lucide-react";

type Props = {
  query: string;
  receiptQuery: string;
  onQueryChange: (value: string) => void;
  onReceiptQueryChange: (value: string) => void;
};

const FeeSearch = ({ query, receiptQuery, onQueryChange, onReceiptQueryChange }: Props) => {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search by student name or ID"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={receiptQuery}
            onChange={(e) => onReceiptQueryChange(e.target.value)}
            placeholder="Search by receipt ID"
            className="w-full bg-transparent text-sm outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default FeeSearch;
