import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ message, onRetry, compact = false }: { message: string; onRetry?: () => void; compact?: boolean }) {
  return (
    <div role="alert" className={`rounded-md border border-rose-400/20 bg-rose-400/5 px-6 text-center ${compact ? "py-8" : "py-12"}`}>
      <AlertCircle className="mx-auto text-rose-300" aria-hidden="true" />
      <p className="mt-3 text-zinc-200">{message}</p>
      {onRetry && <Button onClick={onRetry} className="mt-5"><RefreshCw size={16} /> Try again</Button>}
    </div>
  );
}
