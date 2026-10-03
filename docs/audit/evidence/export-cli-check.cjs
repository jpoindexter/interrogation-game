#!/usr/bin/env node
// Run from the repository root: node docs/audit/evidence/export-cli-check.cjs
// Executes the real export CLI body with synthetic auth and mocked side effects.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const scriptPath = 'scripts/export-data.ts';
const syntheticSecret = 'SYNTHETIC_EXPORT_SECRET_FOR_AUDIT_ONLY';
const source = fs.readFileSync(scriptPath, 'utf8')
  .replace(/^#!.*\n/, '')
  .replace(/^import .*;\n/gm, '');
const executable = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText.replace(/export \{\};?/g, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const runScript = new AsyncFunction(
  'process', 'fetch', 'console', 'writeFileSync', 'mkdirSync', 'dirname', executable,
);

async function main() {
  const logs = [];
  const requests = [];
  const writes = [];
  const directories = [];
  const mockProcess = {
    argv: ['node', scriptPath],
    env: {
      EXPORT_SECRET: syntheticSecret,
      EXPORT_BASE_URL: 'http://synthetic.invalid',
    },
    exit(code) { throw new Error(`Script requested exit ${code}`); },
  };
  const mockFetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return { ok: true, text: async () => '' };
  };
  const mockConsole = {
    log: (...values) => logs.push(values.join(' ')),
    error: (...values) => logs.push(values.join(' ')),
  };
  await runScript(
    mockProcess, mockFetch, mockConsole,
    (...args) => writes.push(args),
    (...args) => directories.push(args),
    path.dirname,
  );
  const request = requests[0];
  if (!request) throw new Error('Export CLI did not issue a mocked request');
  const headers = new Headers(request.options?.headers);
  const result = {
    source: scriptPath,
    execution: 'Actual CLI body transpiled with mocked network, process environment and writes',
    syntheticCredentialsOnly: true,
    realNetworkRequests: 0,
    applicationDataWrites: 0,
    mockRequestCount: requests.length,
    urlContainsSecret: request.url.includes(syntheticSecret),
    logsContainSecret: logs.some(line => line.includes(syntheticSecret)),
    sendsExpectedAuthorization: headers.get('authorization') === `Bearer ${syntheticSecret}`,
    mockWriteCount: writes.length,
    mockDirectoryCreationCount: directories.length,
    limits: 'Proves outbound request and log construction; does not call the real export endpoint or verify persistence.',
  };
  result.regressionReproduced = result.urlContainsSecret
    && result.logsContainSecret && !result.sendsExpectedAuthorization;
  console.log(JSON.stringify(result, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
