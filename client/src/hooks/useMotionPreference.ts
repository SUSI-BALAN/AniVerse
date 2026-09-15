import { useEffect, useState } from 'react';
import { useOptionalLibrary } from '../context/LibraryContext';

export function useMotionPreference() {
  const library = useOptionalLibrary();
  const [system, setSystem] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!media) return;
    const update = () => setSystem(media.matches);
    update(); media.addEventListener?.('change', update);
    return () => media.removeEventListener?.('change', update);
  }, []);
  return system || library?.settings.reduced_motion === 'true';
}
