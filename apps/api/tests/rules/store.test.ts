// Contract tests for the abbreviation rules store (REQ-266). In-memory SQLite, real migrations, real transactions.
import { createClient, Client } from '@libsql/client';
import { ensureRulesSchema, createRule, updateRule, getRule, listRules, ruleHistory, RulesError, radiologistIdForSubject } from '../../src/rules/rulesStore';
import { tempDbUrl, removeTempDbs } from '../support/tempDb';

afterAll(removeTempDbs);

let db: Client;
let actor: number;

const base = (over: Record<string, unknown> = {}) => ({
  code: 'Li',
  organ: 'Liver',
  findingsText: 'Liver is normal in size and shows normal echotexture.',
  ...over
});

const expectError = async (p: Promise<unknown>, status: number, code: string) => {
  const err = await p.then(() => null, (e: unknown) => e);
  expect(err).toBeInstanceOf(RulesError);
  expect((err as RulesError).status).toBe(status);
  expect((err as RulesError).code).toBe(code);
  return err as RulesError;
};

beforeEach(async () => {
  db = createClient({ url: tempDbUrl() });
  await ensureRulesSchema(db);
  const now = new Date().toISOString();
  const r = await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Radiologist', 'MD', 'Consultant', 'TEST-1', 'rad-1', now, now]
  });
  actor = Number(r.lastInsertRowid);
});

afterEach(() => db.close());

describe('schema', () => {
  it('creates the rules tables, the two sex codes and the foreign-key switch', async () => {
    const t = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name");
    const names = t.rows.map((r) => String(r.name));
    expect(names).toEqual(expect.arrayContaining(['radiologists', 'sexes', 'tag_options', 'tag_rule_history', 'tags']));
    expect(names).not.toContain('settings');
    const sexes = await db.execute('SELECT code FROM sexes ORDER BY code');
    expect(sexes.rows.map((r) => r.code)).toEqual(['F', 'M']);
    const fk = await db.execute('PRAGMA foreign_keys');
    expect(Number(fk.rows[0][0])).toBe(1);
  });

  it('refuses an option row that points at a missing tag, and an unknown option kind', async () => {
    await expect(db.execute({ sql: "INSERT INTO tag_options (tag_id, kind) VALUES (999, 'side')", args: [] })).rejects.toThrow();
    const r = await createRule(db, actor, base());
    await expect(db.execute({ sql: "INSERT INTO tag_options (tag_id, kind, code) VALUES (?, 'shape', 'x')", args: [r.id] })).rejects.toThrow();
  });

  it('refuses a size range whose minimum is above its maximum', async () => {
    const r = await createRule(db, actor, base());
    await expect(db.execute({ sql: "INSERT INTO tag_options (tag_id, kind, min_value, max_value) VALUES (?, 'size_range', 5, 1)", args: [r.id] })).rejects.toThrow();
  });
});

describe('creating a rule', () => {
  it('stores the rule, its option sets and version 1 with the editor', async () => {
    const rule = await createRule(db, actor, base({
      code: 'LMOTX',
      impressionText: 'Mild hepatomegaly.',
      impressionKey: 'hepatomegaly',
      options: [
        { kind: 'side', code: 'L' },
        { kind: 'size_range', minValue: 14, maxValue: 15.49, sexCode: 'M' },
        { kind: 'grade', findingsText: 'mildly', impressionText: 'Mild' }
      ]
    }));
    expect(rule.options).toHaveLength(3);
    expect(rule.options[1]).toMatchObject({ kind: 'size_range', minValue: 14, maxValue: 15.49, sexCode: 'M' });
    const history = await ruleHistory(db, rule.id);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ version: 1, changedBy: actor, changeSummary: 'created', oldFindingsText: null, newFindingsText: base().findingsText });
  });

  it('keeps the wording exactly as entered (only the ends are trimmed)', async () => {
    const text = '  Pancreas: Subtle calcification seen around pancreatic tail region.  ';
    const rule = await createRule(db, actor, base({ code: 'PC', findingsText: text }));
    expect(rule.findingsText).toBe(text.trim());
  });

  it('refuses a code that already exists in any letter case', async () => {
    await createRule(db, actor, base({ code: 'Li' }));
    await expectError(createRule(db, actor, base({ code: 'LI' })), 409, 'code-exists');
  });

  it('lists every field that is wrong in one answer', async () => {
    const err = await expectError(createRule(db, actor, { code: '1bad', organ: '', findingsText: '' }), 422, 'validation-failed');
    const paths = (err.details ?? []).map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['code', 'organ', 'findingsText']));
  });

  it('refuses options that are incomplete or repeated', async () => {
    const err = await expectError(createRule(db, actor, base({
      options: [
        { kind: 'side' },
        { kind: 'size_range', minValue: 3 },
        { kind: 'grade' },
        { kind: 'sex' },
        { kind: 'calyx', code: 'u' },
        { kind: 'calyx', code: 'u' }
      ]
    })), 422, 'validation-failed');
    const paths = (err.details ?? []).map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['options[0].code', 'options[1]', 'options[2].findingsText', 'options[3].sexCode', 'options[5]']));
  });

  it('refuses a sex code that is not in the reference table', async () => {
    const err = await expectError(createRule(db, actor, base({ sexCode: 'X' })), 422, 'validation-failed');
    expect(err.details?.[0].path).toBe('sexCode');
  });

  it('refuses a writer who is not a radiologist', async () => {
    await expectError(createRule(db, 999, base()), 403, 'not-a-radiologist');
  });
});

describe('editing a rule', () => {
  it('saves a new version with a summary of what changed, and a before and after snapshot', async () => {
    const rule = await createRule(db, actor, base());
    const res = await updateRule(db, actor, rule.id, base({ findingsText: 'Liver is enlarged.', impressionText: 'Hepatomegaly.' }));
    expect(res.changed).toBe(true);
    expect(res.rule.findingsText).toBe('Liver is enlarged.');
    const history = await ruleHistory(db, rule.id);
    expect(history.map((h) => h.version)).toEqual([1, 2]);
    expect(history[1]).toMatchObject({
      version: 2, changedBy: actor, changeSummary: 'changed: findings text, impression',
      oldFindingsText: base().findingsText, newFindingsText: 'Liver is enlarged.', oldImpressionText: null, newImpressionText: 'Hepatomegaly.'
    });
    expect(history[1].ruleBefore).toMatchObject({ findingsText: base().findingsText });
    expect(history[1].ruleAfter).toMatchObject({ findingsText: 'Liver is enlarged.', impressionText: 'Hepatomegaly.' });
  });

  it('records a change to the option sets, which is versioned too', async () => {
    const rule = await createRule(db, actor, base({ options: [{ kind: 'side', code: 'L' }] }));
    await updateRule(db, actor, rule.id, base({ options: [{ kind: 'side', code: 'L' }, { kind: 'side', code: 'R' }] }));
    const [, v2] = await ruleHistory(db, rule.id);
    expect(v2.changeSummary).toBe('changed: options');
    expect(v2.ruleBefore).toMatchObject({ options: [{ kind: 'side', code: 'L' }] });
    expect(v2.ruleAfter).toMatchObject({ options: [{ kind: 'side', code: 'L' }, { kind: 'side', code: 'R' }] });
    expect((await getRule(db, rule.id)).options).toHaveLength(2);
  });

  it('creates no version when nothing changed', async () => {
    const rule = await createRule(db, actor, base({ options: [{ kind: 'calyx', code: 'u' }] }));
    const res = await updateRule(db, actor, rule.id, base({ options: [{ kind: 'calyx', code: 'u' }] }));
    expect(res.changed).toBe(false);
    expect(await ruleHistory(db, rule.id)).toHaveLength(1);
  });

  it('keeps the code fixed', async () => {
    const rule = await createRule(db, actor, base());
    await expectError(updateRule(db, actor, rule.id, base({ code: 'P' })), 422, 'validation-failed');
  });

  it('reports missing rules as not found', async () => {
    await expectError(updateRule(db, actor, 404, base()), 404, 'not-found');
    await expectError(getRule(db, 404), 404, 'not-found');
    await expectError(ruleHistory(db, 404), 404, 'not-found');
  });

  it('saves nothing when a step fails part way (rule, options and history move together)', async () => {
    const rule = await createRule(db, actor, base({ options: [{ kind: 'side', code: 'L' }] }));
    const failing = {
      execute: db.execute.bind(db),
      batch: db.batch.bind(db),
      transaction: async (mode: 'write') => {
        const tx = await db.transaction(mode);
        const run = tx.execute.bind(tx);
        (tx as any).execute = (stmt: any) => {
          if (String(stmt.sql ?? stmt).startsWith('INSERT INTO tag_rule_history')) throw new Error('disk full');
          return run(stmt);
        };
        return tx;
      }
    };
    await expect(updateRule(failing as unknown as Client, actor, rule.id, base({ findingsText: 'Changed.', options: [{ kind: 'side', code: 'R' }] }))).rejects.toThrow('disk full');
    const after = await getRule(db, rule.id);
    expect(after.findingsText).toBe(base().findingsText);
    expect(after.options).toEqual([{ kind: 'side', code: 'L', minValue: null, maxValue: null, sexCode: null, findingsText: null, impressionText: null, impressionKey: null }]);
    expect(await ruleHistory(db, rule.id)).toHaveLength(1);
  });
});

describe('reading rules', () => {
  it('lists rules in code order and resolves the radiologist for a user', async () => {
    await createRule(db, actor, base({ code: 'U', organ: 'Urinary bladder', findingsText: 'Urinary bladder is adequately distended.' }));
    await createRule(db, actor, base({ code: 'B', organ: 'Uterus', findingsText: 'Uterus is bulky in size.' }));
    expect((await listRules(db)).map((r) => r.code)).toEqual(['B', 'U']);
    expect(await radiologistIdForSubject(db, 'rad-1')).toBe(actor);
    expect(await radiologistIdForSubject(db, 'nobody')).toBeNull();
  });
});
