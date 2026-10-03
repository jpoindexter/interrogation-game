import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { runCodexProcess } from '../src/lib/ai/codex-process';
import { OpenAIProvider } from '../src/lib/ai/openai';
import { interrogate } from '../src/lib/game-ai/interrogate';
import { evaluateAccusation } from '../src/lib/game-ai/evaluate';
import { generateCase } from '../src/lib/game-ai/generate-case';
import type { StructuredTask } from '../src/lib/ai/contracts';

async function waitForPids(file: string): Promise<number[]> {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { return JSON.parse(await readFile(file, 'utf8')); } catch { await delay(10); }
  }
  throw new Error('Fixture processes failed to start');
}
function isAlive(pid: number): boolean {
  try { process.kill(pid, 0); return true; } catch { return false; }
}

test('actual local child and descendant stop on cancellation without a delayed side effect', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'interrogation-abort-test-'));
  const pidsFile = join(directory, 'pids.json'); const marker = join(directory, 'late-marker');
  const controller = new AbortController();
  const descendant = `setTimeout(()=>require('node:fs').writeFileSync(${JSON.stringify(marker)},'late'),500);setInterval(()=>{},1000)`;
  const parent = `const c=require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(descendant)}],{stdio:'ignore'});require('node:fs').writeFileSync(${JSON.stringify(pidsFile)},JSON.stringify([process.pid,c.pid]));setInterval(()=>{},1000)`;
  const running = runCodexProcess({ binary: process.execPath, args: ['-e', parent], input: '',
    directory, timeoutMs: 3000, signal: controller.signal });
  const rejection = assert.rejects(running, (error: { code?: string }) => error.code === 'CANCELLED');
  let pids: number[] = [];
  try {
    pids = await waitForPids(pidsFile);
    assert.ok(pids.every(isAlive));
    controller.abort(); await rejection;
    for (let attempt = 0; attempt < 100 && pids.some(isAlive); attempt++) await delay(10);
    assert.ok(pids.every(pid => !isAlive(pid)), 'both fixture processes must be gone');
    await delay(550);
    await assert.rejects(access(marker));
  } finally {
    controller.abort();
    for (const pid of pids) { try { process.kill(pid, 'SIGKILL'); } catch { /* already exited */ } }
    await rm(directory, { recursive: true, force: true });
  }
});

test('pre-cancelled process and all capabilities reject before starting provider work', async () => {
  const controller = new AbortController(); controller.abort();
  await assert.rejects(runCodexProcess({ binary: '/nonexistent-codex-binary', args: [], input: '', directory: tmpdir(),
    timeoutMs: 100, signal: controller.signal }), (error: { code?: string }) => error.code === 'CANCELLED');
  const execution = { signal: controller.signal };
  const facts = { suspect_name: 'Casey', suspect_role: 'Clerk', setting: 'Fictional office', suspect_true_story: 'Returned',
    suspect_cover_story: 'Stayed away', the_lie: 'Stayed away', the_truth: 'Returned', the_contradiction: 'Visitor log',
    stress_triggers: ['log'], deflection_tactics: ['pause'] };
  const calls = [() => generateCase('bank', 'easy', execution),
    () => interrogate(facts, [], 'When did you return?', 0, 0, [], execution),
    () => evaluateAccusation(facts, [], 'You returned', execution)];
  for (const call of calls) await assert.rejects(call(), (error: { code?: string }) => error.code === 'CANCELLED');
});

const task: StructuredTask = { capability: 'judge', instructions: 'Fictional fixture', input: 'Fictional fixture', schema: {} };
test('Responses forwards cancellation to transport and refuses a late successful response', async () => {
  const controller = new AbortController(); let received: AbortSignal | null | undefined;
  const provider = new OpenAIProvider({ apiKey: 'mock-key', model: 'fixture', timeoutMs: 1000, fetcher: async (_url, init) => {
    received = init?.signal;
    controller.abort();
    return Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: '{}' }] }] });
  } });
  await assert.rejects(provider.generate({ ...task, signal: controller.signal }), (error: { code?: string }) => error.code === 'CANCELLED');
  assert.equal(received?.aborted, true);
});

test('Responses pre-cancelled task performs no fetch', async () => {
  const controller = new AbortController(); controller.abort(); let calls = 0;
  const provider = new OpenAIProvider({ apiKey: 'mock-key', model: 'fixture', timeoutMs: 1000,
    fetcher: async () => { calls++; return Response.json({}); } });
  await assert.rejects(provider.generate({ ...task, signal: controller.signal }));
  assert.equal(calls, 0);
});
