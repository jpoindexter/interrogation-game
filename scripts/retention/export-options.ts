import { readRetentionOptions } from './options';

export function readExportRetentionOptions(argv: string[], env: Record<string, string | undefined>) {
  const age = argv.filter(value => value.startsWith('--days='));
  if (age.length > 1) throw new Error('Use one --days value.');
  const raw = age[0]?.slice('--days='.length) ?? '30';
  const days = Number(raw);
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(days) || days < 1 || days > 3650) {
    throw new Error('Retention days must be an integer from 1 to 3650.');
  }
  return { ...readRetentionOptions(argv.filter(value => !value.startsWith('--days=')), env), days };
}
