import { databaseConfiguration } from '../../src/lib/config/database';
import type { RetentionOptions } from '../../src/lib/storage/hosted/retention';

export interface RetentionCommand extends RetentionOptions { project: string }

function argumentsMap(argv: string[]): Map<string, string> {
  const values = new Map<string, string>();
  for (const argument of argv) {
    const match = /^(--apply|--limit=(\d+)|--confirm-project=([a-z0-9-]+\.supabase\.co))$/.exec(argument);
    if (!match) throw new Error('Use --limit=1..100, --apply and --confirm-project=<project>.supabase.co.');
    const [key, value = 'true'] = argument.slice(2).split('=');
    if (values.has(key)) throw new Error('Repeated retention arguments are not allowed.');
    values.set(key, value);
  }
  return values;
}

export function readRetentionOptions(argv: string[], env: Record<string, string | undefined>): RetentionCommand {
  const values = argumentsMap(argv);
  const limit = Number(values.get('limit') ?? '25');
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) throw new Error('Retention limit must be 1..100.');
  const { url } = databaseConfiguration(env);
  const project = new URL(url).hostname;
  const apply = values.has('apply');
  if (apply && values.get('confirm-project') !== project) {
    throw new Error('Applying retention requires --confirm-project matching the configured Supabase hostname. Preview first.');
  }
  if (!apply && values.has('confirm-project')) throw new Error('Project confirmation only applies with --apply.');
  return { apply, limit, project };
}
