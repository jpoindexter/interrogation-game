import { ensureNotAborted, executionSignal } from './execution';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CodexProvider } from './codex';
import { OpenAIProvider } from './openai';
import { AiError, type AiProvider, type StructuredTask } from './contracts';
import { validateStructured } from './validate';
import { reserveAiWork } from '../limits/ai-scope';

export function providerConfiguration() {
  const provider = process.env.AI_PROVIDER ?? 'codex-local';
  if (!['codex-local', 'openai'].includes(provider)) throw new AiError('PROVIDER_INVALID', 'AI_PROVIDER must be codex-local or openai.');
  const timeoutMs = Math.min(120000, Math.max(1000, Number(process.env.AI_TIMEOUT_MS) || 90000));
  const localBinary = join(process.cwd(), 'node_modules', '.bin', 'codex');
  return { provider, timeoutMs, codexBinary: process.env.CODEX_BIN ?? (existsSync(localBinary) ? localBinary : 'codex'),
    codexModel: process.env.CODEX_MODEL ?? 'gpt-6.1-sol', openaiModel: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
    ragEnabled: process.env.AI_RAG_ENABLED === 'true' };
}

function createProvider(config: ReturnType<typeof providerConfiguration>): AiProvider {
  return config.provider === 'codex-local'
    ? new CodexProvider({ binary: config.codexBinary, model: config.codexModel, timeoutMs: config.timeoutMs })
    : new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY ?? '', model: config.openaiModel, timeoutMs: config.timeoutMs });
}

export async function requestStructured(task: StructuredTask): Promise<Record<string, unknown>> {
  ensureNotAborted(task.signal);
  const config = providerConfiguration();
  const signal = executionSignal(task.signal, config.timeoutMs);
  try {
    reserveAiWork(task);
    const result = await createProvider(config).generate({ ...task, signal });
    ensureNotAborted(signal);
    validateStructured(result, task.schema);
    return result;
  } catch (error) {
    ensureNotAborted(signal);
    throw error;
  }
}
