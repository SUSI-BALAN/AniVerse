import { useEffect, useRef, type RefObject } from 'react';

// Modals are body portals: inert siblings never include a modal ancestor.
export function useModalFocus(ref: RefObject<HTMLElement | null>, open: boolean, close: () => void, busy = false) {
  const latest = useRef({ close, busy }); latest.current = { close, busy };
  useEffect(() => {
    const panel = ref.current;
    if (!open || !panel) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const root = panel.parentElement!;
    const siblings = [...document.body.children].filter((e): e is HTMLElement => e instanceof HTMLElement && e !== root);
    const prior = siblings.map(e => [e, e.inert] as const);
    prior.forEach(([e]) => { e.inert = true; });
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    const elements = () => [...panel.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')].filter(e => !e.closest('[hidden],[inert]'));
    const focus = () => (elements()[0] ?? panel).focus();
    focus();
    const keys = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !latest.current.busy) { e.preventDefault(); latest.current.close(); }
      if (e.key !== 'Tab') return;
      const items = elements(), first = items[0], last = items.at(-1);
      if (!first) { e.preventDefault(); panel.focus(); }
      else if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    const guard = (e: FocusEvent) => { if (!panel.contains(e.target as Node)) focus(); };
    document.addEventListener('keydown', keys); document.addEventListener('focusin', guard);
    return () => {
      document.removeEventListener('keydown', keys); document.removeEventListener('focusin', guard);
      prior.forEach(([e, inert]) => { e.inert = inert; }); document.body.style.overflow = overflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, [open, ref]);
}
