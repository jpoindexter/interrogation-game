import { hostedConfiguration } from '../config/hosted';
import { HostedSessionStorage } from './hosted/session';
import { HostedWorkStorage } from './hosted/budget';
import { HostedGenerationStorage } from './hosted/generation';
import { HostedRedemptionStorage } from './hosted/redemption';
import { HostedAdmissionStorage } from './hosted/admission';

/** Only trusted server environment selects a backend. There is no request override or fallback. */
export function storageBackend(): 'local' | 'supabase' {
  const selected = process.env.SESSION_STORAGE ?? 'local';
  if (selected === 'supabase') { hostedConfiguration(); return selected; }
  if (selected !== 'local') throw new Error('Session storage backend is unsupported.');
  if (process.env.VERCEL) throw new Error('Hosted text requires explicit shared storage configuration.');
  return 'local';
}

/** Adapters hold no session state; authority remains in each shared transaction. */
export function hostedStores() {
  const configuration = hostedConfiguration();
  return { ...configuration, sessions: new HostedSessionStorage(), work: new HostedWorkStorage(),
    generations: new HostedGenerationStorage(), redemption: new HostedRedemptionStorage(),
    admission: new HostedAdmissionStorage() };
}
