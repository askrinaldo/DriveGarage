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
  onRetry 
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
  action
}: {
  icon?: any;
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
