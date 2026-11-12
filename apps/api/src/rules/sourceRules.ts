// Rules verified against Abbreviation Rules v4 (source 133, docs/project/source/133. Abbreviation Rules v4.docx).
// Only entries whose tag code, wording and impression are unambiguous in the source are here: no blanks or placeholder
// symbols, no garbled or missing tag, and no two sentences merged. Every other source entry is listed, with its reason, in
// docs/workitems/WI-024/source-check.md and waits for clarification. Wording is copied exactly; nothing is corrected.
// Organ and sex: the source does not state them; organ is taken from the tag's subject, sex for PR, O, ROP and LOP from
// docs/project/db_design.md (flagged in source-check.md).
import type { Db } from '../db/client';
import { RuleInput, createRule, listRules, radiologistIdForSubject } from './rulesStore';

export const verifiedSourceRules: RuleInput[] = [
  rule('B', 'Uterus', null, 'Uterus is bulky in size.'),
  rule('c', 'Gall bladder', null, 'Gall bladder is contracted (presumably post prandial).'),
  rule('Li', 'Liver', null, 'Liver is normal in size and shows normal echotexture. No focal mass lesion seen. Intrahepatic biliary radicals are normal. Portal vein is normal.'),
  rule('Mc', 'Gall bladder', null, 'Gall bladder is markedly contracted (presumably post prandial).'),
  rule('MML', 'Mesenteric lymph nodes', null, 'Mesenteric Lymphnodes are somewhat enlarged.', 'Mild Mesenteric Lymphadenopathy.'),
  rule('NF', 'Peritoneal cavity', null, 'No free fluid is seen in peritoneal cavity.'),
  rule('NL', 'Lymph nodes', null, 'No significant mesenteric or retroperitoneal lymphadenopathy seen.'),
  rule('O', 'Ovaries', 'F', 'Both ovaries are normal in size, shape and echotexture. No adnexal mass lesion seen.'),
  rule('LOP', 'Left ovary', 'F', 'Left ovary is normal in size, shape and echotexture.'),
  rule('ROP', 'Right ovary', 'F', 'Right ovary is normal in size, shape and echotexture.'),
  rule('P', 'Pancreas', null, 'Pancreas is normal in size and echotexture. Main pancreatic duct is normal.'),
  rule('PC', 'Pancreas', null, 'Pancreas: Subtle calcification seen around pancreatic tail region.', 'cect abdomen to confirm or exclude pancreatic calcification.'),
  rule('PD', 'Pancreas', null, 'Pancreas not clearly visualized due to overlying bowel gases.'),
  rule('PR', 'Prostate', 'M', 'Prostate is normal in size and shows normal echotexture.'),
  rule('S', 'Spleen', null, 'Spleen is normal in size and parenchymal echotexture. No focal mass lesion seen.'),
  rule('U', 'Urinary bladder', null, 'Urinary bladder is adequately distended. Wall thickness is normal. No intraluminal calculus or mass lesion seen.'),
  rule('UME', 'Uterus', null, 'Uterus is mildly enlarged in size.'),
  rule('UNV', 'Uterus', null, 'Uterus Not visualized (h/o Hysterectomy).')
];

function rule(code: string, organ: string, sexCode: string | null, findingsText: string, impressionText: string | null = null): RuleInput {
  return { code, organ, sexCode, findingsText, impressionText, impressionKey: null, reportOrder: null, options: [] };
}

// Creates every verified rule that does not exist yet, recorded against the given radiologist (version 1 each).
export async function seedSourceRules(db: Db, actorId: number): Promise<{ created: string[]; skipped: string[] }> {
  const existing = new Set((await listRules(db)).map((r) => r.code.toLowerCase()));
  const created: string[] = [];
  const skipped: string[] = [];
  for (const r of verifiedSourceRules) {
    if (existing.has(r.code.toLowerCase())) { skipped.push(r.code); continue; }
    await createRule(db, actorId, r);
    created.push(r.code);
  }
  return { created, skipped };
}

// Convenience for a command or script: seeds for the radiologist linked to a signed-in user subject.
export async function seedSourceRulesForSubject(db: Db, subject: string) {
  const actor = await radiologistIdForSubject(db, subject);
  if (actor === null) throw new Error('no radiologist is linked to that user: create the radiologist row first');
  return seedSourceRules(db, actor);
}
