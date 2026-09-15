import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useModalFocus } from "../hooks/useModalFocus";
import { Button } from "./Button";

type ConfirmDialogProps = {
  title: string; description: string; cancelLabel?: string; confirmLabel?: string;
  danger?: boolean; loading?: boolean; requireText?: string;
  onConfirm: () => void | Promise<void>; onCancel: () => void;
};

export function ConfirmDialog({ title, description, cancelLabel = "Cancel", confirmLabel = "Confirm", danger = false, loading = false, requireText, onConfirm, onCancel }: ConfirmDialogProps) {
  const titleId = useId(); const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [typed, setTyped] = useState("");
  const enabled = !loading && (!requireText || typed === requireText);
  useModalFocus(dialogRef, true, onCancel, loading);
  return createPortal(<div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !loading) onCancel(); }}><div ref={dialogRef} tabIndex={-1} className="max-h-[90dvh] overflow-y-auto w-full max-w-md rounded-md border border-outline bg-surface p-5 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}><h2 id={titleId} className="text-lg font-bold text-foreground">{title}</h2><p id={descriptionId} className="mt-2 text-sm text-muted">{description}</p>{requireText && <label className="mt-4 block text-sm font-semibold text-foreground">Type <span className="font-black text-rose-300">{requireText}</span> to continue<input autoComplete="off" value={typed} onChange={(event) => setTyped(event.target.value)} className="control-surface mt-2 h-10 w-full rounded-md px-3" /></label>}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button variant="ghost" disabled={loading} onClick={onCancel}>{cancelLabel}</Button><Button variant={danger ? "danger" : "primary"} disabled={!enabled} onClick={() => void onConfirm()}>{loading ? "Working…" : confirmLabel}</Button></div></div></div>, document.body);
}
