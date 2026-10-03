export interface ServiceReadiness {
  provider: string;
  configured: boolean;
  status: 'unchecked' | 'missing';
  detail: string;
}
export interface ProviderReadiness {
  mode: 'local' | 'hosted';
  status: 'configured' | 'configuration_required';
  services: { ai: ServiceReadiness; voice: ServiceReadiness; storage: ServiceReadiness };
}

function isService(value: unknown): value is ServiceReadiness {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.provider === 'string' && typeof item.configured === 'boolean' &&
    ['unchecked', 'missing'].includes(String(item.status)) && typeof item.detail === 'string';
}

export function parseReadiness(value: unknown): ProviderReadiness {
  if (!value || typeof value !== 'object') throw new Error('Invalid server status');
  const data = value as ProviderReadiness;
  if (!['local', 'hosted'].includes(data.mode) || !['configured', 'configuration_required'].includes(data.status)) {
    throw new Error('Invalid server status');
  }
  if (!data.services || !['ai', 'voice', 'storage'].every(key => isService(data.services[key as keyof typeof data.services]))) {
    throw new Error('Incomplete server status');
  }
  return data;
}
