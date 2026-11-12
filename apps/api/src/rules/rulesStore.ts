// Abbreviation rules (REQ-266): one rule per tag, its option sets, and a version + audit row for every saved change.
// Every write is one transaction: the rule, its options and its history row are saved together or not at all.
import type { ResultSet } from '@libsql/client';
import type { Db } from '../db/client';
import { migrate } from '../db/migrate';
import { rulesMigrations } from '../db/migrations';

export const OPTION_KINDS = ['size_range', 'calyx', 'side', 'grade', 'sex'] as const;
export type OptionKind = (typeof OPTION_KINDS)[number];

export interface OptionInput {
  kind: OptionKind;
  code: string | null;
  minValue: number | null;
  maxValue: number | null;
  sexCode: string | null;
  findingsText: string | null;
  impressionText: string | null;
  impressionKey: string | null;
}

export interface RuleInput {
  code: string;
  organ: string;
  sexCode: string | null;
  findingsText: string;
  impressionText: string | null;
  impressionKey: string | null;
  reportOrder: number | null;
  options: OptionInput[];
}

export interface Rule extends RuleInput {
  id: number;
  createdAt: string;
  updatedAt: string;
}

export interface HistoryEntry {
  version: number;
  changedBy: number;
  changedAt: string;
  changeSummary: string;
  oldFindingsText: string | null;
  newFindingsText: string | null;
  oldImpressionText: string | null;
  newImpressionText: string | null;
  ruleBefore: unknown;
  ruleAfter: unknown;
}

export interface FieldError { path: string; message: string }

export class RulesError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly details?: FieldError[]
  ) {
    super(code);
  }
}

const CODE_RE = /^[A-Za-z][A-Za-z0-9 ]{0,19}$/;
const KEY_RE = /^[a-z][a-z_]{0,39}$/;
const MAX_TEXT = 4000;
const MAX_OPTIONS = 50;

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

// Trims the ends of a text value; blank or missing means null. Inner wording is never changed.
function optionalText(v: unknown, path: string, errors: FieldError[], max = MAX_TEXT): string | null {
  if (v === undefined || v === null) return null;
  if (typeof v !== 'string') { errors.push({ path, message: 'must be text' }); return null; }
  const t = v.trim();
  if (t.length > max) { errors.push({ path, message: `must be at most ${max} characters` }); return null; }
  return t === '' ? null : t;
}

function requiredText(v: unknown, path: string, errors: FieldError[], max = MAX_TEXT): string {
  const t = optionalText(v, path, errors, max);
  if (t === null) errors.push({ path, message: 'is required' });
  return t ?? '';
}

function optionalNumber(v: unknown, path: string, errors: FieldError[]): number | null {
  if (v === undefined || v === null || v === '') return null;
  if (typeof v !== 'number' || !Number.isFinite(v)) { errors.push({ path, message: 'must be a number' }); return null; }
  return v;
}

function parseOption(raw: unknown, path: string, errors: FieldError[]): OptionInput | null {
  if (!isObject(raw)) { errors.push({ path, message: 'must be an object' }); return null; }
  const before = errors.length;
  const kind = raw.kind;
  if (typeof kind !== 'string' || !(OPTION_KINDS as readonly string[]).includes(kind)) {
    errors.push({ path: `${path}.kind`, message: `must be one of ${OPTION_KINDS.join(', ')}` });
    return null;
  }
  const opt: OptionInput = {
    kind: kind as OptionKind,
    code: optionalText(raw.code, `${path}.code`, errors, 20),
    minValue: optionalNumber(raw.minValue, `${path}.minValue`, errors),
    maxValue: optionalNumber(raw.maxValue, `${path}.maxValue`, errors),
    sexCode: optionalText(raw.sexCode, `${path}.sexCode`, errors, 5),
    findingsText: optionalText(raw.findingsText, `${path}.findingsText`, errors),
    impressionText: optionalText(raw.impressionText, `${path}.impressionText`, errors),
    impressionKey: optionalText(raw.impressionKey, `${path}.impressionKey`, errors, 40)
  };
  if (opt.impressionKey !== null && !KEY_RE.test(opt.impressionKey)) errors.push({ path: `${path}.impressionKey`, message: 'must be lower-case words joined by _' });
  switch (opt.kind) {
    case 'side':
    case 'calyx':
      if (!opt.code) errors.push({ path: `${path}.code`, message: `is required for a ${opt.kind} option` });
      break;
    case 'size_range':
      if (opt.minValue === null || opt.maxValue === null) errors.push({ path, message: 'a size range needs minValue and maxValue' });
      else if (opt.minValue > opt.maxValue) errors.push({ path, message: 'minValue must be at most maxValue' });
      break;
    case 'grade':
      if (!opt.findingsText) errors.push({ path: `${path}.findingsText`, message: 'is required for a grade option' });
      break;
    case 'sex':
      if (!opt.sexCode) errors.push({ path: `${path}.sexCode`, message: 'is required for a sex option' });
      break;
  }
  return errors.length > before ? null : opt;
}

// Checks the shape of a rule from a request. Sex codes are checked against the database later (checkReferences).
export function validateRuleInput(raw: unknown): RuleInput {
  const errors: FieldError[] = [];
  if (!isObject(raw)) throw new RulesError(422, 'validation-failed', [{ path: 'body', message: 'must be an object' }]);
  const code = requiredText(raw.code, 'code', errors, 20);
  if (code && !CODE_RE.test(code)) errors.push({ path: 'code', message: 'must start with a letter and use letters, digits or spaces (max 20)' });
  const organ = requiredText(raw.organ, 'organ', errors, 80);
  const findingsText = requiredText(raw.findingsText, 'findingsText', errors);
  const impressionText = optionalText(raw.impressionText, 'impressionText', errors);
  const impressionKey = optionalText(raw.impressionKey, 'impressionKey', errors, 40);
  if (impressionKey !== null && !KEY_RE.test(impressionKey)) errors.push({ path: 'impressionKey', message: 'must be lower-case words joined by _' });
  const sexCode = optionalText(raw.sexCode, 'sexCode', errors, 5);
  let reportOrder: number | null = null;
  if (raw.reportOrder !== undefined && raw.reportOrder !== null) {
    if (Number.isInteger(raw.reportOrder) && (raw.reportOrder as number) >= 0 && (raw.reportOrder as number) <= 10000) reportOrder = raw.reportOrder as number;
    else errors.push({ path: 'reportOrder', message: 'must be a whole number from 0 to 10000' });
  }
  const options: OptionInput[] = [];
  if (raw.options !== undefined && raw.options !== null) {
    if (!Array.isArray(raw.options)) errors.push({ path: 'options', message: 'must be a list' });
    else if (raw.options.length > MAX_OPTIONS) errors.push({ path: 'options', message: `at most ${MAX_OPTIONS} options` });
    else {
      const seen = new Set<string>();
      raw.options.forEach((o, i) => {
        const opt = parseOption(o, `options[${i}]`, errors);
        if (!opt) return;
        const key = [opt.kind, opt.code ?? '', opt.sexCode ?? '', opt.minValue ?? '', opt.maxValue ?? ''].join('|');
        if (seen.has(key)) errors.push({ path: `options[${i}]`, message: 'duplicates an earlier option' });
        seen.add(key);
        options.push(opt);
      });
    }
  }
  if (errors.length) throw new RulesError(422, 'validation-failed', errors);
  return { code, organ, sexCode, findingsText, impressionText, impressionKey, reportOrder, options };
}

// Schema: the migrations run once per database client (foreign keys are switched on for the connection first).
const ready = new WeakMap<Db, Promise<void>>();
export function ensureRulesSchema(db: Db): Promise<void> {
  let p = ready.get(db);
  if (!p) {
    p = (async () => {
      await db.execute('PRAGMA foreign_keys = ON');
      await migrate(db, rulesMigrations);
    })();
    ready.set(db, p);
    p.catch(() => ready.delete(db));
  }
  return p;
}

// A database client or a transaction: both run statements the same way.
type Queryable = { execute(stmt: any): Promise<ResultSet> };
const nowIso = () => new Date().toISOString();

async function checkReferences(q: Queryable, input: RuleInput) {
  const codes = [input.sexCode, ...input.options.map((o) => o.sexCode)].filter((c): c is string => !!c);
  const errors: FieldError[] = [];
  for (const c of new Set(codes)) {
    const r = await q.execute({ sql: 'SELECT code FROM sexes WHERE code = ?', args: [c] });
    if (r.rows.length === 0) errors.push({ path: c === input.sexCode ? 'sexCode' : 'options', message: `unknown sex code "${c}"` });
  }
  if (errors.length) throw new RulesError(422, 'validation-failed', errors);
}

async function assertActor(q: Queryable, actorId: number) {
  const r = await q.execute({ sql: 'SELECT id FROM radiologists WHERE id = ?', args: [actorId] });
  if (r.rows.length === 0) throw new RulesError(403, 'not-a-radiologist');
}

// The radiologist row linked to a signed-in user (null when the user has none).
export async function radiologistIdForSubject(db: Db, subject: string): Promise<number | null> {
  await ensureRulesSchema(db);
  const r = await db.execute({ sql: 'SELECT id FROM radiologists WHERE user_subject = ?', args: [subject] });
  return r.rows.length ? Number(r.rows[0].id) : null;
}

const toRuleBase = (row: Record<string, any>, options: OptionInput[]): Omit<Rule, 'id' | 'createdAt' | 'updatedAt'> & { id: number } => ({
  id: Number(row.id),
  code: String(row.code),
  organ: String(row.organ),
  sexCode: row.sex_code == null ? null : String(row.sex_code),
  findingsText: String(row.findings_text),
  impressionText: row.impression_text == null ? null : String(row.impression_text),
  impressionKey: row.impression_key == null ? null : String(row.impression_key),
  reportOrder: row.report_order == null ? null : Number(row.report_order),
  options
});

async function readRule(q: Queryable, id: number): Promise<Rule | null> {
  const t = await q.execute({ sql: 'SELECT * FROM tags WHERE id = ?', args: [id] });
  if (t.rows.length === 0) return null;
  const o = await q.execute({ sql: 'SELECT * FROM tag_options WHERE tag_id = ? ORDER BY id', args: [id] });
  const options: OptionInput[] = o.rows.map((r) => ({
    kind: String(r.kind) as OptionKind,
    code: r.code == null ? null : String(r.code),
    minValue: r.min_value == null ? null : Number(r.min_value),
    maxValue: r.max_value == null ? null : Number(r.max_value),
    sexCode: r.sex_code == null ? null : String(r.sex_code),
    findingsText: r.findings_text == null ? null : String(r.findings_text),
    impressionText: r.impression_text == null ? null : String(r.impression_text),
    impressionKey: r.impression_key == null ? null : String(r.impression_key)
  }));
  return { ...toRuleBase(t.rows[0], options), createdAt: String(t.rows[0].created_at), updatedAt: String(t.rows[0].updated_at) };
}

async function insertOptions(q: Queryable, tagId: number, options: OptionInput[]) {
  for (const o of options) {
    await q.execute({
      sql: 'INSERT INTO tag_options (tag_id, kind, code, min_value, max_value, sex_code, findings_text, impression_text, impression_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [tagId, o.kind, o.code, o.minValue, o.maxValue, o.sexCode, o.findingsText, o.impressionText, o.impressionKey]
    });
  }
}

// The rule as a stable JSON snapshot (fixed key order, no database ids), stored in history for every version.
export function snapshot(r: RuleInput): string {
  return JSON.stringify({
    code: r.code,
    organ: r.organ,
    sexCode: r.sexCode,
    findingsText: r.findingsText,
    impressionText: r.impressionText,
    impressionKey: r.impressionKey,
    reportOrder: r.reportOrder,
    options: r.options.map((o) => ({
      kind: o.kind, code: o.code, minValue: o.minValue, maxValue: o.maxValue, sexCode: o.sexCode,
      findingsText: o.findingsText, impressionText: o.impressionText, impressionKey: o.impressionKey
    }))
  });
}

function changedFields(before: Rule, after: RuleInput): string[] {
  const out: string[] = [];
  if (before.organ !== after.organ) out.push('organ');
  if (before.sexCode !== after.sexCode) out.push('sex');
  if (before.findingsText !== after.findingsText) out.push('findings text');
  if (before.impressionText !== after.impressionText) out.push('impression');
  if (before.impressionKey !== after.impressionKey) out.push('impression key');
  if (before.reportOrder !== after.reportOrder) out.push('report order');
  if (JSON.stringify(before.options) !== JSON.stringify(after.options)) out.push('options');
  return out;
}

export async function listRules(db: Db): Promise<Rule[]> {
  await ensureRulesSchema(db);
  const t = await db.execute('SELECT id FROM tags ORDER BY code COLLATE NOCASE');
  const out: Rule[] = [];
  for (const row of t.rows) {
    const r = await readRule(db, Number(row.id));
    if (r) out.push(r);
  }
  return out;
}

export async function getRule(db: Db, id: number): Promise<Rule> {
  await ensureRulesSchema(db);
  const r = await readRule(db, id);
  if (!r) throw new RulesError(404, 'not-found');
  return r;
}

export async function createRule(db: Db, actorId: number, raw: unknown): Promise<Rule> {
  const input = validateRuleInput(raw);
  await ensureRulesSchema(db);
  const tx = await db.transaction('write');
  try {
    await assertActor(tx, actorId);
    await checkReferences(tx, input);
    const dup = await tx.execute({ sql: 'SELECT id FROM tags WHERE code = ?', args: [input.code] });
    if (dup.rows.length) throw new RulesError(409, 'code-exists');
    const ts = nowIso();
    const ins = await tx.execute({
      sql: 'INSERT INTO tags (code, organ, sex_code, findings_text, impression_text, impression_key, report_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [input.code, input.organ, input.sexCode, input.findingsText, input.impressionText, input.impressionKey, input.reportOrder, ts, ts]
    });
    const tagId = Number(ins.lastInsertRowid);
    await insertOptions(tx, tagId, input.options);
    const created = (await readRule(tx, tagId))!;
    await tx.execute({
      sql: 'INSERT INTO tag_rule_history (tag_id, changed_by, changed_at, version, change_summary, old_findings_text, new_findings_text, old_impression_text, new_impression_text, rule_before, rule_after) VALUES (?, ?, ?, 1, ?, NULL, ?, NULL, ?, NULL, ?)',
      args: [tagId, actorId, ts, 'created', input.findingsText, input.impressionText, snapshot(input)]
    });
    await tx.commit();
    return created;
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

// Saves a new version of a rule. A save with no change creates no version. The code is fixed once created.
export async function updateRule(db: Db, actorId: number, id: number, raw: unknown): Promise<{ rule: Rule; changed: boolean }> {
  const input = validateRuleInput(raw);
  await ensureRulesSchema(db);
  const tx = await db.transaction('write');
  try {
    await assertActor(tx, actorId);
    const before = await readRule(tx, id);
    if (!before) throw new RulesError(404, 'not-found');
    if (input.code.toLowerCase() !== before.code.toLowerCase()) throw new RulesError(422, 'validation-failed', [{ path: 'code', message: 'cannot be changed' }]);
    input.code = before.code;
    await checkReferences(tx, input);
    const fields = changedFields(before, input);
    if (fields.length === 0) {
      await tx.commit();
      return { rule: before, changed: false };
    }
    const ts = nowIso();
    await tx.execute({
      sql: 'UPDATE tags SET organ = ?, sex_code = ?, findings_text = ?, impression_text = ?, impression_key = ?, report_order = ?, updated_at = ? WHERE id = ?',
      args: [input.organ, input.sexCode, input.findingsText, input.impressionText, input.impressionKey, input.reportOrder, ts, id]
    });
    await tx.execute({ sql: 'DELETE FROM tag_options WHERE tag_id = ?', args: [id] });
    await insertOptions(tx, id, input.options);
    const after = (await readRule(tx, id))!;
    const v = await tx.execute({ sql: 'SELECT COALESCE(MAX(version), 0) + 1 AS v FROM tag_rule_history WHERE tag_id = ?', args: [id] });
    await tx.execute({
      sql: 'INSERT INTO tag_rule_history (tag_id, changed_by, changed_at, version, change_summary, old_findings_text, new_findings_text, old_impression_text, new_impression_text, rule_before, rule_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      args: [id, actorId, ts, Number(v.rows[0].v), `changed: ${fields.join(', ')}`, before.findingsText, input.findingsText, before.impressionText, input.impressionText, snapshot(before), snapshot(input)]
    });
    await tx.commit();
    return { rule: after, changed: true };
  } catch (e) {
    await tx.rollback().catch(() => undefined);
    throw e;
  } finally {
    tx.close();
  }
}

export async function ruleHistory(db: Db, id: number): Promise<HistoryEntry[]> {
  await ensureRulesSchema(db);
  if (!(await readRule(db, id))) throw new RulesError(404, 'not-found');
  const r = await db.execute({ sql: 'SELECT * FROM tag_rule_history WHERE tag_id = ? ORDER BY version', args: [id] });
  const parse = (s: unknown) => (typeof s === 'string' ? JSON.parse(s) : null);
  return r.rows.map((row) => ({
    version: Number(row.version),
    changedBy: Number(row.changed_by),
    changedAt: String(row.changed_at),
    changeSummary: String(row.change_summary),
    oldFindingsText: row.old_findings_text == null ? null : String(row.old_findings_text),
    newFindingsText: row.new_findings_text == null ? null : String(row.new_findings_text),
    oldImpressionText: row.old_impression_text == null ? null : String(row.old_impression_text),
    newImpressionText: row.new_impression_text == null ? null : String(row.new_impression_text),
    ruleBefore: parse(row.rule_before),
    ruleAfter: parse(row.rule_after)
  }));
}
