import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function EmptyState({ icon: Icon, title, description, action }: { icon: LucideIcon; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center border-y border-outline px-5 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-muted"><Icon size={22} aria-hidden="true" /></span>
      <h2 className="mt-5 text-xl font-bold text-foreground">{title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
