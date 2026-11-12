// Contract tests for the patient report header (WI-025, REQ-267). In-memory-like SQLite files, real migrations, real transactions.
import { createClient, Client } from '@libsql/client';
import { ensureReportsSchema, createDraft, getReport, updateDraft, issueSrNo, ReportsError } from '../../src/reports/reportsStore';
import { tempDbUrl, removeTempDbs } from '../support/tempDb';

afterAll(removeTempDbs);

let db: Client;
let actor: number;

const header = (over: Record<string, unknown> = {}) => ({
  uhid: 'UHID-1',
  name: 'Asha Rao',
  sexCode: 'F',
  ageText: '34 Y',
  referredBy: 'Dr. Mehta',
  reportDate: '2026-11-12',
  ...over
});

const expectError = async (p: Promise<unknown>, status: number, code: string) => {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(ReportsError);
  expect((err as ReportsError).status).toBe(status);
  expect((err as ReportsError).code).toBe(code);
};

beforeEach(async () => {
  db = createClient({ url: tempDbUrl() });
  await ensureReportsSchema(db);
  const now = new Date().toISOString();
  const r = await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Radiologist', 'MD', 'Consultant', 'TEST-1', 'rad-1', now, now]
  });
  actor = Number(r.lastInsertRowid);
});

afterEach(() => db.close());

describe('schema', () => {
  it('creates the patient header tables with the Sr. No counter seeded at zero', async () => {
    const c = await db.execute("SELECT last_value FROM sr_no_counter WHERE name = 'report_sr_no'");
    expect(Number(c.rows[0].last_value)).toBe(0);
    const names = (await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'")).rows.map((r) => String(r.name));
    expect(names).toEqual(expect.arrayContaining(['patients', 'reports', 'sr_no_counter']));
  });

  it('refuses a Sr. No on a draft (the CHECK constraint)', async () => {
    const p = await db.execute({ sql: "INSERT INTO patients (uhid, name, sex_code, created_at) VALUES ('U-X', 'X', 'M', 'now')", args: [] });
    await expect(db.execute({
      sql: "INSERT INTO reports (patient_id, status, age_text, report_date, sr_no, radiologist_id, created_at) VALUES (?, 'draft', '1 Y', '2026-11-12', 7, ?, 'now')",
      args: [Number(p.lastInsertRowid), actor]
    })).rejects.toThrow();
  });
});

describe('draft create', () => {
  it('stores the sex as M or F, gives the title source, and leaves Sr. No empty', async () => {
    const r = await createDraft(db, actor, header());
    expect(r.status).toBe('draft');
    expect(r.srNo).toBeNull();
    expect(r.sexCode).toBe('F');
    expect(r.reportDate).toBe('2026-11-12');
    expect(r.radiologistId).toBe(actor);
  });

  it('refuses an unknown sex code and stores nothing', async () => {
    await expectError(createDraft(db, actor, header({ sexCode: 'X', uhid: 'UHID-2' })), 422, 'invalid-report');
    const n = await db.execute("SELECT COUNT(*) AS n FROM patients WHERE uhid = 'UHID-2'");
    expect(Number(n.rows[0].n)).toBe(0);
  });

  it('refuses a date that is not a real YYYY-MM-DD date', async () => {
    await expectError(createDraft(db, actor, header({ reportDate: '12-Nov-26' })), 422, 'invalid-report');
    await expectError(createDraft(db, actor, header({ reportDate: '2026-02-30' })), 422, 'invalid-report');
  });

  it('refuses a missing required field and names it', async () => {
    const err = await createDraft(db, actor, header({ name: '  ' })).then(() => null, (e: ReportsError) => e);
    expect(err).toBeInstanceOf(ReportsError);
    expect(err!.details).toEqual([{ path: 'name', message: 'required' }]);
  });

  it('reuses a known patient with the same name and sex', async () => {
    const a = await createDraft(db, actor, header());
    const b = await createDraft(db, actor, header({ ageText: '35 Y' }));
    const p = await db.execute("SELECT COUNT(*) AS n FROM patients WHERE uhid = 'UHID-1'");
    expect(Number(p.rows[0].n)).toBe(1);
    expect(a.uhid).toBe(b.uhid);
  });

  it('refuses a known UHID with a different name or sex and changes nothing', async () => {
    await createDraft(db, actor, header());
    await expectError(createDraft(db, actor, header({ name: 'Someone Else' })), 409, 'patient-mismatch');
    await expectError(createDraft(db, actor, header({ sexCode: 'M' })), 409, 'patient-mismatch');
    const p = await db.execute("SELECT name, sex_code FROM patients WHERE uhid = 'UHID-1'");
    expect(String(p.rows[0].name)).toBe('Asha Rao');
    expect(String(p.rows[0].sex_code)).toBe('F');
  });
});

describe('draft update', () => {
  it('ignores a client-sent Sr. No and stores none', async () => {
    const r = await createDraft(db, actor, header());
    const u = await updateDraft(db, r.id, { ageText: '36 Y', srNo: 99 });
    expect(u.ageText).toBe('36 Y');
    expect(u.srNo).toBeNull();
    expect((await getReport(db, r.id)).srNo).toBeNull();
  });

  it('refuses a change to a report that is no longer a draft', async () => {
    const r = await createDraft(db, actor, header());
    await issueSrNo(db, r.id);
    await expectError(updateDraft(db, r.id, { ageText: '40 Y' }), 409, 'not-a-draft');
  });

  it('returns 404 for a report that does not exist', async () => {
    await expectError(updateDraft(db, 9999, { ageText: '40 Y' }), 404, 'not-found');
    await expectError(getReport(db, 9999), 404, 'not-found');
  });
});

describe('Sr. No allocation', () => {
  it('gives 1, then 2, across reports', async () => {
    const a = await createDraft(db, actor, header({ uhid: 'A' }));
    const b = await createDraft(db, actor, header({ uhid: 'B', name: 'B Person', sexCode: 'M' }));
    expect(await issueSrNo(db, a.id)).toBe(1);
    expect(await issueSrNo(db, b.id)).toBe(2);
    expect((await getReport(db, a.id)).srNo).toBe(1);
    expect((await getReport(db, a.id)).status).toBe('issued');
  });

  it('refuses a second issue of the same report and the counter does not move', async () => {
    const a = await createDraft(db, actor, header({ uhid: 'A' }));
    const b = await createDraft(db, actor, header({ uhid: 'B', name: 'B Person', sexCode: 'M' }));
    await issueSrNo(db, a.id);
    await expectError(issueSrNo(db, a.id), 409, 'not-a-draft');
    expect(await issueSrNo(db, b.id)).toBe(2);
  });

  it('never reuses a number after a cancel, and cancelled reports keep theirs', async () => {
    const a = await createDraft(db, actor, header({ uhid: 'A' }));
    const b = await createDraft(db, actor, header({ uhid: 'B', name: 'B Person', sexCode: 'M' }));
    const c = await createDraft(db, actor, header({ uhid: 'C', name: 'C Person', sexCode: 'M' }));
    expect(await issueSrNo(db, a.id)).toBe(1);
    await db.execute({ sql: "UPDATE reports SET status = 'cancelled' WHERE id = ?", args: [a.id] });
    expect((await getReport(db, a.id)).srNo).toBe(1);
    expect(await issueSrNo(db, b.id)).toBe(2);
    expect(await issueSrNo(db, c.id)).toBe(3);
  });

  it('gives unique numbers to concurrent issues', async () => {
    const ids: number[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await createDraft(db, actor, header({ uhid: `U-${i}`, name: `Person ${i}`, sexCode: i % 2 ? 'M' : 'F' }));
      ids.push(r.id);
    }
    const nums = await Promise.all(ids.map((id) => issueSrNo(db, id)));
    expect([...nums].sort((x, y) => x - y)).toEqual([1, 2, 3, 4, 5]);
  });
});
