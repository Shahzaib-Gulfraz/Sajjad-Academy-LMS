import { Inbox, Loader2, AlertCircle } from "lucide-react";

type SectionLoaderProps = {
  label?: string;
  className?: string;
};

type EmptyStateProps = {
  title: string;
  description?: string;
  className?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
};

type ErrorStateProps = {
  title: string;
  description?: string;
  className?: string;
  action?: React.ReactNode;
};

export const SectionLoader = ({
  label = "Loading...",
  className = "",
}: SectionLoaderProps) => {
  return (
    <div
      className={`flex min-h-[200px] items-center justify-center rounded-2xl border border-border/50 bg-gradient-to-b from-card/50 to-muted/10 p-8 ${className} animate-fade-in`}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="relative h-10 w-10">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

export const EmptyState = ({
  title,
  description,
  className = "",
  icon,
  action,
}: EmptyStateProps) => {
  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/50 bg-gradient-to-b from-muted/20 to-background/50 p-8 text-center ${className} animate-fade-in`}
    >
      <div className="mb-4 rounded-full bg-primary/10 p-3 text-primary ring-4 ring-primary/5">
        {icon ?? <Inbox className="h-6 w-6" />}
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
};

export const ErrorState = ({
  title,
  description,
  className = "",
  action,
}: ErrorStateProps) => {
  return (
    <div
      className={`flex min-h-[200px] flex-col items-center justify-center rounded-2xl border border-destructive/30 bg-destructive/5 p-8 text-center ${className} animate-fade-in`}
    >
      <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
};
