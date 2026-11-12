// Contract tests for normal-organ tag expansion (WI-027, REQ-268). Real store, real migrations, seeded verified rules.
import { createClient, Client } from '@libsql/client';
import { ensureRulesSchema, createRule } from '../../src/rules/rulesStore';
import { seedSourceRules, verifiedSourceRules } from '../../src/rules/sourceRules';
import { expandTags, splitTags } from '../../src/rules/tagExpansion';
import { tempDbUrl, removeTempDbs } from '../support/tempDb';

afterAll(removeTempDbs);

let db: Client;
let actor: number;

const wording = (code: string) => verifiedSourceRules.find((r) => r.code.toLowerCase() === code.toLowerCase())!.findingsText;

beforeEach(async () => {
  db = createClient({ url: tempDbUrl() });
  await ensureRulesSchema(db);
  const now = new Date().toISOString();
  const r = await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Radiologist', 'MD', 'Consultant', 'TEST-1', 'rad-1', now, now]
  });
  actor = Number(r.lastInsertRowid);
  await seedSourceRules(db, actor);
});

afterEach(() => db.close());

describe('splitTags', () => {
  it('takes tags one per line, separated by spaces or commas, and skips blanks', () => {
    expect(splitTags('Li\r\nP  S,\n\nU')).toEqual(['Li', 'P', 'S', 'U']);
    expect(splitTags('   ')).toEqual([]);
  });
});

describe('expandTags', () => {
  it('gives each seeded tag exactly the wording from the rules', async () => {
    for (const tag of ['Li', 'P', 'PD', 'S', 'U', 'NF', 'NL', 'Mc', 'c']) {
      const r = await expandTags(db, tag);
      expect(r.unknown).toEqual([]);
      expect(r.findings).toHaveLength(1);
      expect(r.findings[0].findingsText).toBe(wording(tag));
    }
  });

  it('puts findings in report order, not typing order', async () => {
    const r = await expandTags(db, 'NL\nLi\nU');
    expect(r.findings.map((f) => f.tag)).toEqual(['U', 'Li', 'NL']);
    expect(r.findings.map((f) => f.reportPosition)).toEqual([1, 2, 9]);
  });

  it('keeps typed order for tags that share a report position (P and PD; C and Mc)', async () => {
    expect((await expandTags(db, 'PD P')).findings.map((f) => f.tag)).toEqual(['PD', 'P']);
    expect((await expandTags(db, 'c Mc')).findings.map((f) => f.tag)).toEqual(['c', 'Mc']);
    expect((await expandTags(db, 'Mc c')).findings.map((f) => f.tag)).toEqual(['Mc', 'c']);
  });

  it('accepts tags given in a sequence on one line', async () => {
    const r = await expandTags(db, 'Li, P S');
    expect(r.findings.map((f) => f.tag)).toEqual(['Li', 'P', 'S']);
  });

  it('reports an unknown tag and still gives the others', async () => {
    const r = await expandTags(db, 'Li\nXX\nS');
    expect(r.findings.map((f) => f.tag)).toEqual(['Li', 'S']);
    expect(r.unknown).toEqual([{ token: 'XX', reason: 'not-a-normal-organ-tag' }]);
  });

  it('treats a rule in the store that is not a normal-organ tag as unknown', async () => {
    const r = await expandTags(db, 'PC');
    expect(r.findings).toEqual([]);
    expect(r.unknown).toEqual([{ token: 'PC', reason: 'not-a-normal-organ-tag' }]);
  });

  it('reports L and R as unknown until their rules exist, then gives left and right kidney wording', async () => {
    const before = await expandTags(db, 'L R');
    expect(before.findings).toEqual([]);
    expect(before.unknown).toEqual([
      { token: 'L', reason: 'no-rule' },
      { token: 'R', reason: 'no-rule' }
    ]);

    const leftText = 'Left kidney is normal in size, shape and echogenicity. Cortico-medullary differentiation is maintained. No evidence of calculus or hydronephrosis is seen.';
    const rightText = 'Right kidney is normal in size, shape and echogenicity. Cortico-medullary differentiation is maintained. No evidence of calculus or hydronephrosis is seen.';
    await createRule(db, actor, { code: 'L', organ: 'Kidney', findingsText: leftText });
    await createRule(db, actor, { code: 'R', organ: 'Kidney', findingsText: rightText });

    const after = await expandTags(db, 'L\nR');
    expect(after.unknown).toEqual([]);
    // Report order: R (position 6) before L (position 7), whatever the typing order.
    expect(after.findings.map((f) => [f.tag, f.findingsText])).toEqual([['R', rightText], ['L', leftText]]);
  });

  it('gives a repeated tag its finding once', async () => {
    const r = await expandTags(db, 'Li\nLi\nLI');
    expect(r.findings).toHaveLength(1);
    expect(r.unknown).toEqual([]);
  });

  it('gives an empty result for empty text', async () => {
    expect(await expandTags(db, '  \n ')).toEqual({ findings: [], unknown: [] });
  });
});
