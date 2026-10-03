import { motion, fadeUp, smooth } from '../components/motion';
import { useProviderReadiness } from './useProviderReadiness';
import type { ProviderReadiness } from './provider-readiness';
import { serviceStatusLabel } from './provider-status';

const LABELS = { ai: 'Suspect and case engine', voice: 'Voice input and output', storage: 'Storage configuration' };

export function ConfigurationList({ value }: { value: ProviderReadiness }) {
  return <dl className="space-y-4">
    {Object.entries(value.services).map(([key, service]) => <div key={key}>
      <dt className="text-sm font-bold text-gray-300">{LABELS[key as keyof typeof LABELS]}</dt>
      <dd className="text-sm text-gray-400">{service.provider} — {serviceStatusLabel(service)}</dd>
      <dd className="mt-1 text-sm text-gray-400">{service.detail}</dd>
      {service.observation && <dd className="mt-1 text-xs text-gray-400">
        Last {service.observation.operation} request: <time dateTime={service.observation.observedAt}>
          {new Date(service.observation.observedAt).toLocaleTimeString()}
        </time>. This records one request, not a guarantee that the next will succeed.
      </dd>}
    </div>)}
  </dl>;
}

export default function ConnectionSettings() {
  const { value, error, refresh } = useProviderReadiness();
  return (
    <motion.section variants={fadeUp} transition={smooth} className="space-y-4 bg-surface-darker border border-surface-dark rounded-sm p-6">
      <h2 className="text-sm text-gray-300 font-bold">Connection status</h2>
      <p className="text-sm text-gray-400">Providers are configured on the server. This view reads configuration and recent requested operations; it makes no model or voice calls.</p>
      {value && <><p className="text-sm text-gray-300">{value.mode === 'local' ? 'Local demo' : 'Hosted mode'}</p><ConfigurationList value={value} /></>}
      {value?.mode === 'hosted' && <p className="text-sm text-warn">Hosted gameplay also requires shared session persistence. Configuring an API key and leaderboard alone does not complete deployment.</p>}
      {!value && !error && <p role="status" className="text-sm text-gray-400">Checking configuration…</p>}
      {error && <p role="alert" className="text-sm text-accent">{error}</p>}
      <button type="button" onClick={refresh} className="rounded-sm border border-surface px-3 py-2 text-sm text-gray-300">Refresh status</button>
      <p className="text-sm text-gray-400">Observations expire after five minutes and clear when this server restarts or provider settings change. A voice response does not confirm microphone permission or audible playback. Voice is optional; you can continue with text.</p>
      <p className="text-sm text-gray-400">Older versions stored keys in this browser. They are no longer used. You can remove the legacy appSettings entry in browser storage; resetting preferences here leaves it untouched.</p>
    </motion.section>
  );
}
