import { createHash } from 'node:crypto';
import { ensureNotAborted, executionSignal } from './execution';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CodexProvider } from './codex';
import { OpenAIProvider } from './openai';
import { AiError, type AiProvider, type StructuredTask } from './contracts';
import { validateStructured } from './validate';
import { reserveAiWork } from '../limits/ai-scope';
import { observeProvider } from '../config/provider-observations';

export function providerConfiguration() {
  const provider = process.env.AI_PROVIDER ?? 'codex-local';
  if (!['codex-local', 'openai'].includes(provider)) throw new AiError('PROVIDER_INVALID', 'AI_PROVIDER must be codex-local or openai.');
  const timeoutMs = Math.min(120000, Math.max(1000, Number(process.env.AI_TIMEOUT_MS) || 90000));
  const localBinary = join(process.cwd(), 'node_modules', '.bin', 'codex');
  return { provider, timeoutMs, codexBinary: process.env.CODEX_BIN ?? (existsSync(localBinary) ? localBinary : 'codex'),
    codexModel: process.env.CODEX_MODEL ?? 'gpt-6.1-sol', openaiModel: process.env.OPENAI_MODEL ?? 'gpt-6-luna',
    ragEnabled: process.env.AI_RAG_ENABLED === 'true' };
}

function createProvider(config: ReturnType<typeof providerConfiguration>, model: string): AiProvider {
  return config.provider === 'codex-local'
    ? new CodexProvider({ binary: config.codexBinary, model, timeoutMs: config.timeoutMs })
    : new OpenAIProvider({ apiKey: process.env.OPENAI_API_KEY ?? '', model, timeoutMs: config.timeoutMs });
}

export async function requestStructured(task: StructuredTask): Promise<Record<string, unknown>> {
  ensureNotAborted(task.signal);
  const config = providerConfiguration();
  const model = config.provider === 'openai' ? config.openaiModel
    : task.capability === 'case' ? process.env.CODEX_CASE_MODEL ?? 'gpt-6-luna' : config.codexModel;
  const signal = executionSignal(task.signal, config.timeoutMs);
  reserveAiWork(task);
  return observeProvider('ai', task.capability, async () => {
    try {
      const result = await createProvider(config, model).generate({ ...task, signal });
      ensureNotAborted(signal);
      try { validateStructured(result, task.schema); }
      catch (error) {
        try { task.onInvalidResponse?.(result); } catch { /* Preserve the original validation failure. */ }
        throw error;
      }
      task.onProvenance?.({ provider: config.provider, model, capability: task.capability,
        promptHash: createHash('sha256').update(task.instructions).digest('hex') });
      return result;
    } catch (error) {
      ensureNotAborted(signal);
      throw error;
    }
  });
}
