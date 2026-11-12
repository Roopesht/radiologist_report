// Patient report header (WI-025, REQ-267): the patient, a draft report, and the Sr. No allocator.
// Sr. No is assigned only at issue (decisions 2026-11-12): sequential and global, never reused, one transaction.
// issueSrNo is built and tested here but no route calls it; the issue step belongs to REQ-273.
import type { Db } from '../db/client';
import { migrate } from '../db/migrate';
import { reportsMigrations, rulesMigrations } from '../db/migrations';

export const REPORT_STATUSES = ['draft', 'issued', 'cancelled'] as const;

export interface ReportHeader {
  id: number;
  status: (typeof REPORT_STATUSES)[number];
  srNo: number | null;
  uhid: string;
  name: string;
  sexCode: string;
  ageText: string;
  referredBy: string | null;
  reportDate: string;
  radiologistId: number;
  issuedAt: string | null;
  createdAt: string;
}

export interface FieldError { path: string; message: string }

export class ReportsError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: FieldError[]
  ) {
    super(code);
  }
}

// Anything with execute(): the client or a transaction.
type Exec = Pick<Db, 'execute'>;

const ready = new WeakMap<Db, Promise<void>>();

// Creates the sexes and radiologists tables (rules migration) and the patient header tables, once per database client.
export function ensureReportsSchema(db: Db): Promise<void> {
  let p = ready.get(db);
  if (!p) {
    p = (async () => {
      await db.execute('PRAGMA foreign_keys = ON');
      await migrate(db, [...rulesMigrations, ...reportsMigrations]);
    })();
    ready.set(db, p);
    p.catch(() => ready.delete(db));
  }
  return p;
}

// ---- validation -------------------------------------------------------------------------------------------------

const DATE = /^\d{4}-\d{2}-\d{2}$/;

const isoDateOk = (v: string): boolean => {
  if (!DATE.test(v)) return false;
  const d = new Date(v + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
};

function requiredText(raw: unknown, path: string, errors: FieldError[]): string {
  if (typeof raw !== 'string' || raw.trim() === '') {
    errors.push({ path, message: 'required' });
    return '';
  }
  return raw.trim();
}

function optionalText(raw: unknown, path: string, errors: FieldError[]): string | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'string') {
    errors.push({ path, message: 'must be text' });
    return null;
  }
  const t = raw.trim();
  return t === '' ? null : t;
}

function dateField(raw: unknown, path: string, errors: FieldError[]): string {
  if (typeof raw !== 'string' || !isoDateOk(raw)) {
    errors.push({ path, message: 'must be a date as YYYY-MM-DD' });
    return '';
  }
  return raw;
}

export interface CreateInput {
  uhid: string;
  name: string;
  sexCode: string;
  ageText: string;
  referredBy: string | null;
  reportDate: string;
}

// Field-level checks. Whether the sex code exists is checked against the database in createDraft.
export function validateCreate(raw: unknown): CreateInput {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const input: CreateInput = {
    uhid: requiredText(body.uhid, 'uhid', errors),
    name: requiredText(body.name, 'name', errors),
    sexCode: requiredText(body.sexCode, 'sexCode', errors),
    ageText: requiredText(body.ageText, 'ageText', errors),
    referredBy: optionalText(body.referredBy, 'referredBy', errors),
    reportDate: dateField(body.reportDate, 'reportDate', errors)
  };
  if (errors.length) throw new ReportsError(422, 'invalid-report', errors);
  return input;
}

export interface UpdateInput {
  ageText?: string;
  referredBy?: string | null;
  reportDate?: string;
}

// Only the report's own header fields can change. srNo and any other key are ignored, never stored.
export function validateUpdate(raw: unknown): UpdateInput {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const errors: FieldError[] = [];
  const out: UpdateInput = {};
  if (body.ageText !== undefined) out.ageText = requiredText(body.ageText, 'ageText', errors);
  if (body.referredBy !== undefined) out.referredBy = optionalText(body.referredBy, 'referredBy', errors);
  if (body.reportDate !== undefined) out.reportDate = dateField(body.reportDate, 'reportDate', errors);
  if (errors.length) throw new ReportsError(422, 'invalid-report', errors);
  return out;
}

// ---- reads ------------------------------------------------------------------------------------------------------

const HEADER_SQL = `SELECT r.id, r.status, r.sr_no, r.age_text, r.referred_by, r.report_date, r.radiologist_id, r.issued_at, r.created_at,
  p.uhid, p.name, p.sex_code
  FROM reports r JOIN patients p ON p.id = r.patient_id WHERE r.id = ?`;

const toHeader = (row: Record<string, unknown>): ReportHeader => ({
  id: Number(row.id),
  status: String(row.status) as ReportHeader['status'],
  srNo: row.sr_no === null || row.sr_no === undefined ? null : Number(row.sr_no),
  uhid: String(row.uhid),
  name: String(row.name),
  sexCode: String(row.sex_code),
  ageText: String(row.age_text),
  referredBy: row.referred_by === null || row.referred_by === undefined ? null : String(row.referred_by),
  reportDate: String(row.report_date),
  radiologistId: Number(row.radiologist_id),
  issuedAt: row.issued_at === null || row.issued_at === undefined ? null : String(row.issued_at),
  createdAt: String(row.created_at)
});

export async function getReport(db: Db, id: number): Promise<ReportHeader> {
  await ensureReportsSchema(db);
  const r = await db.execute({ sql: HEADER_SQL, args: [id] });
  if (!r.rows.length) throw new ReportsError(404, 'not-found');
  return toHeader(r.rows[0] as Record<string, unknown>);
}

// ---- writes -----------------------------------------------------------------------------------------------------

// A draft report for a patient. The UHID identifies the patient: a new UHID creates the patient; a known UHID must match
// the stored name and sex, otherwise the request is refused rather than changing another patient's record.
export async function createDraft(db: Db, radiologistId: number, raw: unknown): Promise<ReportHeader> {
  const input = validateCreate(raw);
  await ensureReportsSchema(db);
  const tx = await db.transaction('write');
  try {
    const sex = await tx.execute({ sql: 'SELECT code FROM sexes WHERE code = ?', args: [input.sexCode] });
    if (!sex.rows.length) throw new ReportsError(422, 'invalid-report', [{ path: 'sexCode', message: 'unknown sex code' }]);

    const now = new Date().toISOString();
    const found = await tx.execute({ sql: 'SELECT id, name, sex_code FROM patients WHERE uhid = ?', args: [input.uhid] });
    let patientId: number;
    if (found.rows.length) {
      const p = found.rows[0];
      if (String(p.name) !== input.name || String(p.sex_code) !== input.sexCode) {
        throw new ReportsError(409, 'patient-mismatch');
      }
      patientId = Number(p.id);
    } else {
      const ins = await tx.execute({
        sql: 'INSERT INTO patients (uhid, name, sex_code, created_at) VALUES (?, ?, ?, ?)',
        args: [input.uhid, input.name, input.sexCode, now]
      });
      patientId = Number(ins.lastInsertRowid);
    }

    const rep = await tx.execute({
      sql: `INSERT INTO reports (patient_id, status, age_text, referred_by, report_date, sr_no, radiologist_id, issued_at, created_at)
            VALUES (?, 'draft', ?, ?, ?, NULL, ?, NULL, ?)`,
      args: [patientId, input.ageText, input.referredBy, input.reportDate, radiologistId, now]
    });
    const id = Number(rep.lastInsertRowid);
    const header = await tx.execute({ sql: HEADER_SQL, args: [id] });
    await tx.commit();
    return toHeader(header.rows[0] as Record<string, unknown>);
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

// Header fields of a draft. A report that is not a draft (issued or cancelled) is refused.
export async function updateDraft(db: Db, id: number, raw: unknown): Promise<ReportHeader> {
  const input = validateUpdate(raw);
  await ensureReportsSchema(db);
  const tx = await db.transaction('write');
  try {
    const cur = await tx.execute({ sql: 'SELECT status FROM reports WHERE id = ?', args: [id] });
    if (!cur.rows.length) throw new ReportsError(404, 'not-found');
    if (String(cur.rows[0].status) !== 'draft') throw new ReportsError(409, 'not-a-draft');

    const sets: string[] = [];
    const args: (string | null)[] = [];
    if (input.ageText !== undefined) { sets.push('age_text = ?'); args.push(input.ageText); }
    if (input.referredBy !== undefined) { sets.push('referred_by = ?'); args.push(input.referredBy); }
    if (input.reportDate !== undefined) { sets.push('report_date = ?'); args.push(input.reportDate); }
    if (sets.length) {
      await tx.execute({ sql: `UPDATE reports SET ${sets.join(', ')} WHERE id = ?`, args: [...args, id] });
    }
    const header = await tx.execute({ sql: HEADER_SQL, args: [id] });
    await tx.commit();
    return toHeader(header.rows[0] as Record<string, unknown>);
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

// ---- Sr. No -----------------------------------------------------------------------------------------------------

// Runs inside the caller's transaction. Increments the counter, then sets the number on the draft. If the draft is no
// longer a draft without a number, nothing changes: the caller rolls back, so the counter does not move either.
export async function allocateSrNo(tx: Exec, reportId: number, now: string = new Date().toISOString()): Promise<number> {
  const c = await tx.execute({
    sql: "UPDATE sr_no_counter SET last_value = last_value + 1 WHERE name = 'report_sr_no' RETURNING last_value",
    args: []
  });
  const n = Number(c.rows[0].last_value);
  const u = await tx.execute({
    sql: "UPDATE reports SET sr_no = ?, status = 'issued', issued_at = ? WHERE id = ? AND status = 'draft' AND sr_no IS NULL",
    args: [n, now, reportId]
  });
  if (u.rowsAffected !== 1) throw new ReportsError(409, 'not-a-draft');
  return n;
}

// Issues one draft: allocates its Sr. No in a single write transaction (BEGIN IMMEDIATE), so concurrent calls cannot
// produce the same number. Not called by any route in WI-025.
// libsql opens a separate SQLite connection per transaction, so two write transactions at once fail with SQLITE_BUSY
// (no duplicate is written, but the second approval would fail). Issues are queued per database client so they run one
// after another in this process. Across processes SQLite still refuses a second writer (BUSY), never a duplicate.
const issueQueue = new WeakMap<Db, Promise<unknown>>();

export function issueSrNo(db: Db, reportId: number): Promise<number> {
  const prev = issueQueue.get(db) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(() => issueOne(db, reportId));
  issueQueue.set(db, run);
  return run;
}

async function issueOne(db: Db, reportId: number): Promise<number> {
  await ensureReportsSchema(db);
  const tx = await db.transaction('write');
  try {
    const n = await allocateSrNo(tx, reportId);
    await tx.commit();
    return n;
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}
