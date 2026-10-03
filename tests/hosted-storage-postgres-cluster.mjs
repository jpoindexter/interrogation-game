import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const execute = promisify(execFile);
const binary = name => join(process.env.POSTGRES_BIN ?? '/opt/homebrew/bin', name);
export const literal = value => `'${String(value).replaceAll("'", "''")}'`;
export const json = value => `${literal(JSON.stringify(value))}::jsonb`;

// Explicit opt-in runner: never discover a running cluster or use project credentials.
export async function isolatedPostgres() {
  const root = await mkdtemp('/tmp/interrogation-pg-');
  const data = join(root, 'data');
  const socket = join(root, 'socket');
  const inherited = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('PG')));
  const env = { ...inherited, PGHOST: socket, PGPORT: '5432', PGUSER: 'fixture_owner',
    PGDATABASE: 'postgres', PGPASSWORD: '', PGSERVICEFILE: '/dev/null',
    PGOPTIONS: '-c statement_timeout=5000 -c lock_timeout=3000', LC_ALL: 'C' };
  let started = false;
  async function stop() {
    if (started) {
      await execute(binary('pg_ctl'), ['-D', data, '-m', 'immediate', '-w', 'stop'], { env });
      started = false;
    }
    await rm(root, { recursive: true, force: true });
  }
  async function sql(statement) {
    const { stdout } = await execute(binary('psql'), ['-X', '-qAt', '-v', 'ON_ERROR_STOP=1',
      '-h', socket, '-p', '5432', '-U', 'fixture_owner', '-d', 'postgres', '-c', statement],
    { env, maxBuffer: 2 * 1024 * 1024 });
    return stdout.trim();
  }
  async function migrate(path) {
    await execute(binary('psql'), ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '-h', socket,
      '-p', '5432', '-U', 'fixture_owner', '-d', 'postgres', '-f', path], { env });
  }
  async function rpc(name, args, role = 'service_role') {
    const output = await sql(`SET ROLE ${role}; SELECT public.${name}(${args.join(',')});`);
    return JSON.parse(output);
  }
  try {
    await mkdir(socket, { mode: 0o700 });
    await execute(binary('initdb'), ['-D', data, '-U', 'fixture_owner', '-A', 'trust', '--no-locale', '-E', 'UTF8'], { env });
    await execute(binary('pg_ctl'), ['-D', data, '-l', join(root, 'postgres.log'), '-w', 'start',
      '-o', `-c listen_addresses='' -c unix_socket_directories='${socket}' -p 5432`], { env });
    started = true;
    await sql('CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;');
    return { sql, rpc, migrate, stop };
  } catch (error) { await stop(); throw error; }
}
