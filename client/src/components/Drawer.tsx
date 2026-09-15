import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useId, useRef, type ReactNode } from 'react';
import { useModalFocus } from '../hooks/useModalFocus';
import { useMotionPreference } from '../hooks/useMotionPreference';

export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const panel = useRef<HTMLElement>(null), titleId = useId(), reduced = useMotionPreference();
  useModalFocus(panel, open, onClose);
  if (!open) return null;
  return createPortal(<div className="fixed inset-0 z-50 overflow-hidden bg-black/70" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <motion.section ref={panel} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={titleId}
      initial={{ x: reduced ? 0 : '100%' }} animate={{ x: 0 }} transition={{ duration: reduced ? 0 : .22 }}
      className="absolute inset-y-0 right-0 w-[min(88vw,24rem)] overflow-y-auto border-l border-outline bg-surface p-5 pb-[calc(2rem+env(safe-area-inset-bottom))] shadow-2xl">
      <div className="flex items-center justify-between gap-3"><h2 id={titleId} className="text-lg font-bold">{title}</h2><button type="button" onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-muted hover:bg-white/8" aria-label="Close"><X size={20} aria-hidden="true" /></button></div>
      <div className="mt-6">{children}</div>
    </motion.section>
  </div>, document.body);
}
