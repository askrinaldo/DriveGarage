import { ReactNode } from "react";
import { Loader2, AlertCircle, FileBox } from "lucide-react";
import { Button } from "./ui/button";

export function LoadingState({ message = "Laster..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full gap-4 text-muted-foreground animate-in fade-in duration-500">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
      <p className="font-mono text-sm uppercase tracking-wider">{message}</p>
    </div>
  );
}

export function ErrorState({
  title = "Noe gikk galt",
  message = "Kunne ikke laste data.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] w-full max-w-md mx-auto text-center gap-4">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-2">
        <AlertCircle className="w-8 h-8 text-destructive" />
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" className="mt-4">
          Prøv igjen
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon = FileBox,
  title,
  description,
  action,
}: {
  icon?: React.ElementType;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-8 min-h-[300px] text-center border-2 border-dashed border-border rounded-lg bg-card/50">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
}

/* ── Skeleton primitives ─────────────────────────────────────── */
function Bone({ className = "" }: { className?: string }) {
  return <div className={`bg-muted/50 rounded-xl ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="p-2 space-y-5 animate-pulse max-w-6xl mx-auto">
      <Bone className="h-8 w-1/3" />
      <Bone className="h-4 w-1/2 opacity-60" />
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-3 mt-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen space-y-8 pb-12 animate-pulse">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2">
        <div className="space-y-2.5">
          <Bone className="h-3 w-20" />
          <Bone className="h-9 w-56" />
          <Bone className="h-3 w-44 opacity-60" />
        </div>
        <Bone className="h-10 w-36" />
      </div>
      <Bone className="h-20 rounded-2xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Bone key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-4">
          <Bone className="h-4 w-28" />
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-44 rounded-2xl" />
            ))}
          </div>
          <Bone className="h-40 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Bone className="h-4 w-28" />
          <Bone className="h-60 rounded-2xl" />
          <Bone className="h-28 rounded-2xl" />
          <Bone className="h-36 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function VehicleListSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-8 w-44 rounded-xl" />
          <Bone className="h-4 w-64 opacity-60 rounded-full" />
        </div>
        <Bone className="h-10 w-36 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Bone key={i} className="h-52 rounded-xl border border-border/30" />
        ))}
      </div>
    </div>
  );
}

export function VehicleDetailSkeleton() {
  return (
    <div className="space-y-6 pb-24 animate-pulse">
      {/* Back + title row */}
      <div className="flex items-start gap-4">
        <Bone className="h-10 w-10 rounded-lg shrink-0" />
        <div className="space-y-2 flex-1">
          <Bone className="h-8 w-2/3" />
          <Bone className="h-4 w-1/2 opacity-60" />
        </div>
        <div className="flex gap-2 shrink-0">
          {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-10 w-10 rounded-lg" />)}
        </div>
      </div>
      {/* Hero image placeholder */}
      <Bone className="h-48 rounded-xl" />
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Bone key={i} className="h-20 rounded-xl" />)}
      </div>
      {/* Tabs bar */}
      <Bone className="h-12 rounded-lg" />
      {/* Timeline items */}
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Bone key={i} className="h-36 rounded-xl" />)}
      </div>
    </div>
  );
}
