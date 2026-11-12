// A fresh SQLite file per test. Not ':memory:': libsql opens a separate, empty connection for each transaction on an in-memory
// database, so transactions would not see the schema. Files are removed by removeTempDb.
import fs from 'fs';
import os from 'os';
import path from 'path';

const made: string[] = [];

export function tempDbUrl(): string {
  const file = path.join(os.tmpdir(), `knm-test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.db`);
  made.push(file);
  return 'file:' + file.split(path.sep).join('/');
}

export function removeTempDbs(): void {
  for (const f of made.splice(0)) {
    for (const suffix of ['', '-journal', '-wal', '-shm']) {
      // Windows can keep a file locked for a moment after its client closed: leave such a temp file behind rather than fail
      try { fs.rmSync(f + suffix, { force: true }); } catch { /* locked */ }
    }
  }
}
