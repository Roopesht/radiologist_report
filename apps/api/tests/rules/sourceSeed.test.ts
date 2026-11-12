// Contract: the verified source rules match Abbreviation Rules v4 (source 133) word for word, and only verified entries are seeded.
// The expected text below is copied from the source document (docs/project/source/133. Abbreviation Rules v4.docx).
import { createClient, Client } from '@libsql/client';
import { ensureRulesSchema, listRules, getRule } from '../../src/rules/rulesStore';
import { seedSourceRules, verifiedSourceRules } from '../../src/rules/sourceRules';
import { tempDbUrl, removeTempDbs } from '../support/tempDb';

afterAll(removeTempDbs);

const SOURCE: Record<string, { findings: string; impression?: string; organ?: string; sex?: string }> = {
  B: { findings: 'Uterus is bulky in size.' },
  c: { findings: 'Gall bladder is contracted (presumably post prandial).' },
  Li: { findings: 'Liver is normal in size and shows normal echotexture. No focal mass lesion seen. Intrahepatic biliary radicals are normal. Portal vein is normal.' },
  Mc: { findings: 'Gall bladder is markedly contracted (presumably post prandial).' },
  MML: { findings: 'Mesenteric Lymphnodes are somewhat enlarged.', impression: 'Mild Mesenteric Lymphadenopathy.' },
  NF: { findings: 'No free fluid is seen in peritoneal cavity.' },
  NL: { findings: 'No significant mesenteric or retroperitoneal lymphadenopathy seen.' },
  O: { findings: 'Both ovaries are normal in size, shape and echotexture. No adnexal mass lesion seen.', sex: 'F' },
  LOP: { findings: 'Left ovary is normal in size, shape and echotexture.', sex: 'F' },
  ROP: { findings: 'Right ovary is normal in size, shape and echotexture.', sex: 'F' },
  P: { findings: 'Pancreas is normal in size and echotexture. Main pancreatic duct is normal.' },
  PC: { findings: 'Pancreas: Subtle calcification seen around pancreatic tail region.', impression: 'cect abdomen to confirm or exclude pancreatic calcification.' },
  PD: { findings: 'Pancreas not clearly visualized due to overlying bowel gases.' },
  PR: { findings: 'Prostate is normal in size and shows normal echotexture.', sex: 'M' },
  S: { findings: 'Spleen is normal in size and parenchymal echotexture. No focal mass lesion seen.' },
  U: { findings: 'Urinary bladder is adequately distended. Wall thickness is normal. No intraluminal calculus or mass lesion seen.' },
  UME: { findings: 'Uterus is mildly enlarged in size.' },
  UNV: { findings: 'Uterus Not visualized (h/o Hysterectomy).' }
};

// Source entries that are NOT seeded (see docs/workitems/WI-024/source-check.md). Each must stay unseeded.
const NOT_SEEDED = ['ADPKD', 'DS', 'Ga', 'UB2', 'UB3', 'BU', 'SL', 'UU', 'Upp', 'LMOT', 'SCROTUM', 'NECK', 'VENOUS DOPPLER', 'MILD RPOC', 'RT ADNEXA'];

let db: Client;

beforeEach(async () => {
  db = createClient({ url: tempDbUrl() });
  await ensureRulesSchema(db);
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Radiologist', 'MD', 'Consultant', 'TEST-1', 'rad-1', now, now]
  });
});
afterEach(() => db.close());

it('has exactly the verified entries, and each one matches the source wording', () => {
  expect(verifiedSourceRules.map((r) => r.code).sort()).toEqual(Object.keys(SOURCE).sort());
  for (const r of verifiedSourceRules) {
    const s = SOURCE[r.code];
    expect(r.findingsText).toBe(s.findings);
    expect(r.impressionText ?? undefined).toBe(s.impression);
    if (s.sex) expect(r.sexCode).toBe(s.sex);
    expect(r.options).toEqual([]);
  }
});

it('stores an impression only where the source has one', () => {
  const withImpression = verifiedSourceRules.filter((r) => r.impressionText !== null).map((r) => r.code).sort();
  expect(withImpression).toEqual(['MML', 'PC']);
});

it('contains no placeholder symbols or blanks in any seeded wording', () => {
  for (const r of verifiedSourceRules) {
    expect(r.findingsText).not.toMatch(/�|\.\.\./);
    expect(r.impressionText ?? '').not.toMatch(/�|\.\.\./);
  }
});

it('seeds nothing that the source check did not verify', () => {
  const codes = verifiedSourceRules.map((r) => r.code.toLowerCase());
  for (const c of NOT_SEEDED) expect(codes).not.toContain(c.toLowerCase());
});

it('seeds into the database, records version 1 for each, and is safe to run again', async () => {
  const first = await seedSourceRules(db, 1);
  expect(first.created).toHaveLength(verifiedSourceRules.length);
  expect(first.skipped).toEqual([]);
  const rules = await listRules(db);
  expect(rules).toHaveLength(verifiedSourceRules.length);
  const li = await getRule(db, rules.find((r) => r.code === 'Li')!.id);
  expect(li.findingsText).toBe(SOURCE.Li.findings);
  expect(li.options).toEqual([]);
  const again = await seedSourceRules(db, 1);
  expect(again.created).toEqual([]);
  expect(again.skipped).toHaveLength(verifiedSourceRules.length);
  const history = await db.execute('SELECT COUNT(*) AS n FROM tag_rule_history');
  expect(Number(history.rows[0].n)).toBe(verifiedSourceRules.length);
});
