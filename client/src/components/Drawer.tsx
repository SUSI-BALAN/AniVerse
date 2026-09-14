import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panelRef = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    previouslyFocusedRef.current = previouslyFocused;
    const panel = panelRef.current;
    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])') ?? []);
    const elements = focusable();
    (elements[0] ?? panel)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const currentElements = focusable();
      if (currentElements.length === 0) {
        event.preventDefault();
        panel?.focus();
        return;
      }
      const first = currentElements[0];
      const last = currentElements[currentElements.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  return (
    <AnimatePresence onExitComplete={() => previouslyFocusedRef.current?.focus()}>
      {open && (
        <div className="fixed inset-0 z-50 overflow-hidden lg:hidden">
          <motion.button aria-label="Close drawer" className="absolute inset-0 h-full w-full bg-black/70" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.section ref={panelRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId} initial={{ x: reduceMotion ? 0 : "100%" }} animate={{ x: 0 }} exit={{ x: reduceMotion ? 0 : "100%" }} transition={{ duration: reduceMotion ? 0 : 0.22, ease: "easeOut" }} className="absolute inset-y-0 right-0 w-[min(88vw,24rem)] overflow-y-auto border-l border-outline bg-surface p-5 shadow-2xl">
            <div className="flex items-center justify-between"><h2 id={titleId} className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-white/8 hover:text-foreground" aria-label="Close"><X size={20} /></button></div>
            <div className="mt-6">{children}</div>
          </motion.section>
        </div>
      )}
    </AnimatePresence>
  );
}
