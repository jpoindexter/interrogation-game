import { useEffect, useState } from 'react';
import { parseReadiness, type ProviderReadiness } from './provider-readiness';

export function useProviderReadiness() {
  const [value, setValue] = useState<ProviderReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const check = async () => {
      if (pending) return;
      pending = true;
      try {
        const response = await fetch('/api/health', {
          signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]), cache: 'no-store',
        });
        if (!response.ok) throw new Error('Server status unavailable');
        const next = parseReadiness(await response.json());
        if (!controller.signal.aborted) { setValue(next); setError(null); }
      } catch {
        if (!controller.signal.aborted) { setValue(null); setError('The game server could not be reached. Its current status is unknown.'); }
      } finally { pending = false; }
    };
    void check();
    const interval = setInterval(() => void check(), 60_000);
    window.addEventListener('focus', check);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', check); };
  }, [revision]);
  const refresh = () => { setValue(null); setError(null); setRevision(count => count + 1); };
  return { value, error, refresh };
}
