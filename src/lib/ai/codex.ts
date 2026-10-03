import { ensureNotAborted } from './execution';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AiError, type AiProvider, type StructuredTask } from './contracts';
import { CODEX_INSTRUCTIONS, codexArguments } from './codex-config';
import { verifyCodexVersion } from './codex-version';
import { parseCodexOutput, runCodexProcess } from './codex-process';

export class CodexProvider implements AiProvider {
  constructor(private readonly options: { binary?: string; model?: string; timeoutMs?: number } = {}) {}

  async generate(task: StructuredTask): Promise<Record<string, unknown>> {
    ensureNotAborted(task.signal);
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
      throw new AiError('LOCAL_ONLY', 'The Codex subscription provider is available only on the local demo host.');
    }
    const binary = this.options.binary ?? 'codex';
    await verifyCodexVersion(binary, task.signal);
    ensureNotAborted(task.signal);
    const directory = await mkdtemp(join(tmpdir(), 'interrogation-ai-'));
    try {
      const schemaPath = join(directory, 'response.schema.json');
      const instructionsPath = join(directory, 'instructions.md');
      await Promise.all([writeFile(schemaPath, JSON.stringify(task.schema), { mode: 0o600 }),
        writeFile(instructionsPath, CODEX_INSTRUCTIONS, { mode: 0o600 })]);
      const args = codexArguments({ directory, schemaPath, instructionsPath, model: this.options.model ?? 'gpt-6.1-sol' });
      const output = await runCodexProcess({ binary, args,
        input: `${task.instructions}\n\nTASK DATA:\n${task.input}`, directory,
        signal: task.signal, timeoutMs: this.options.timeoutMs ?? 90000 });
      ensureNotAborted(task.signal);
      return parseCodexOutput(output);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  }
}
