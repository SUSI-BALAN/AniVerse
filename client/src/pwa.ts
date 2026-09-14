export type UpdateState = { updateAvailable: boolean; applyUpdate: () => void };

export function registerPwa(onUpdate: (apply: () => void) => void) {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return () => undefined;
  let registration: ServiceWorkerRegistration | undefined;
  navigator.serviceWorker.register('/sw.js').then(value => {
    registration = value;
    if (value.waiting) onUpdate(() => { value.waiting?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload(); });
    value.addEventListener('updatefound', () => {
      const worker = value.installing;
      worker?.addEventListener('statechange', () => { if (worker.state === 'installed' && navigator.serviceWorker.controller) onUpdate(() => { value.waiting?.postMessage({ type: 'SKIP_WAITING' }); window.location.reload(); }); });
    });
  }).catch(() => undefined);
  return () => { registration = undefined; };
}
