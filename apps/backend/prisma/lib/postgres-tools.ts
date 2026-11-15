import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { Pool } from 'pg';

const exec = promisify(execFile);

function binary(name: string) {
  const executable = name + (process.platform === 'win32' ? '.exe' : '');
  if (process.env.PG_BIN) return path.join(process.env.PG_BIN, executable);
  if (process.platform === 'win32') {
    const root = path.join(process.env.ProgramFiles ?? 'C:/Program Files', 'PostgreSQL');
    if (fs.existsSync(root)) {
      for (const version of fs.readdirSync(root).sort((a, b) => Number(b) - Number(a))) {
        const candidate = path.join(root, version, 'bin', executable);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }
  return executable;
}

function pgEnv(connection: string) {
  const url = new URL(connection);
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('URL phải dùng PostgreSQL');
  return {
    ...process.env,
    PGHOST: url.hostname, PGPORT: url.port || '5432', PGDATABASE: decodeURIComponent(url.pathname.slice(1)),
    PGUSER: decodeURIComponent(url.username), PGPASSWORD: decodeURIComponent(url.password),
    PGSSLMODE: url.searchParams.get('sslmode') ?? 'prefer', PGCONNECT_TIMEOUT: '10',
  };
}

export async function backupDatabase(connection: string, output: string) {
  const target = path.resolve(output);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) throw new Error('File backup đã tồn tại; chọn tên file mới: ' + target);
  await exec(binary('pg_dump'), ['--format=custom', '--no-owner', '--no-privileges', '--file', target], {
    env: pgEnv(connection), maxBuffer: 4 * 1024 * 1024,
  });
  return target;
}

export async function restoreDatabase(connection: string, input: string) {
  const source = path.resolve(input);
  if (!fs.existsSync(source)) throw new Error('Không tìm thấy file backup');
  const pool = new Pool({ connectionString: connection, connectionTimeoutMillis: 10000 });
  let serverVersion = 0;
  try {
    const result = await pool.query("SELECT count(*)::int AS count FROM information_schema.tables WHERE table_schema NOT IN ('pg_catalog', 'information_schema')");
    if (result.rows[0].count !== 0) throw new Error('Chỉ restore vào database kiểm thử rỗng; không ghi đè database có bảng');
    serverVersion = Number((await pool.query('SHOW server_version_num')).rows[0].server_version_num);
  } finally { await pool.end(); }
  if (serverVersion < 170000) {
    // pg_restore 17+ emits a setting unknown to PG16, even for PG16 archives.
    // Restore its SQL using psql, omitting only that session setting.
    const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'assessment-restore-'));
    const sqlFile = path.join(temporary, 'restore.sql');
    try {
      await exec(binary('pg_restore'), ['--no-owner', '--no-privileges', '--file', sqlFile, source], {
        env: pgEnv(connection), maxBuffer: 4 * 1024 * 1024,
      });
      const sql = fs.readFileSync(sqlFile, 'utf8').replace(/^SET transaction_timeout = 0;\r?\n/gm, '');
      fs.writeFileSync(sqlFile, sql, { mode: 0o600 });
      await exec(binary('psql'), ['--no-psqlrc', '--set', 'ON_ERROR_STOP=1', '--single-transaction', '--file', sqlFile], {
        env: pgEnv(connection), maxBuffer: 4 * 1024 * 1024,
      });
    } finally {
      if (fs.existsSync(sqlFile)) fs.unlinkSync(sqlFile);
      fs.rmdirSync(temporary);
    }
    return;
  }
  await exec(binary('pg_restore'), ['--exit-on-error', '--single-transaction', '--no-owner', '--no-privileges', '--dbname', decodeURIComponent(new URL(connection).pathname.slice(1)), source], {
    env: pgEnv(connection), maxBuffer: 4 * 1024 * 1024,
  });
}
