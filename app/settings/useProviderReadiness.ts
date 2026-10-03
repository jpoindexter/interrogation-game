import { useEffect, useState } from 'react';
import { parseReadiness, type ProviderReadiness } from './provider-readiness';

export function useProviderReadiness() {
  const [value, setValue] = useState<ProviderReadiness | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/health', { signal: controller.signal, cache: 'no-store' })
      .then(response => { if (!response.ok) throw new Error('Server status unavailable'); return response.json(); })
      .then(data => { if (!controller.signal.aborted) setValue(parseReadiness(data)); })
      .catch(() => { if (!controller.signal.aborted) setError('Server configuration could not be checked.'); });
    return () => controller.abort();
  }, [revision]);
  const refresh = () => { setValue(null); setError(null); setRevision(count => count + 1); };
  return { value, error, refresh };
}
