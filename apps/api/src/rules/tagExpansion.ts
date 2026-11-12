// Normal-organ tag expansion (WI-027, REQ-268). Turns typed tags into findings wording from the abbreviation rules store,
// in fixed report order, and reports every tag it cannot expand. Wording is read from the store, never copied here.
import type { Db } from '../db/client';
import { listRules } from './rulesStore';

// The tags of REQ-268 and their fixed report position (docs/requirements/REQ-268/req.md). Tags that share a position
// (P and PD; C and Mc) keep their typed order inside it.
const REPORT_POSITION: Record<string, number> = {
  U: 1,
  LI: 2,
  P: 3,
  PD: 3,
  S: 4,
  C: 5,
  MC: 5,
  R: 6,
  L: 7,
  NF: 8,
  NL: 9
};

export const MAX_EXPAND_TEXT = 2000;

export interface Finding {
  tag: string;        // the tag as the rules store spells it
  reportPosition: number;
  findingsText: string;
}

export interface UnknownTag {
  token: string;      // the text as typed
  reason: 'not-a-normal-organ-tag' | 'no-rule';
}

export interface ExpansionResult {
  findings: Finding[];
  unknown: UnknownTag[];
}

// Splits the typed text into tags: one per line, or several separated by spaces or commas. Blank pieces are skipped.
export function splitTags(text: string): string[] {
  return text.split(/[\r\n,\s]+/).filter((t) => t.length > 0);
}

export async function expandTags(db: Db, text: string): Promise<ExpansionResult> {
  const rulesByCode = new Map<string, { code: string; findingsText: string }>();
  for (const r of await listRules(db)) rulesByCode.set(r.code.toUpperCase(), { code: r.code, findingsText: r.findingsText });

  const findings: Finding[] = [];
  const unknown: UnknownTag[] = [];
  const seen = new Set<string>();

  for (const token of splitTags(text)) {
    const key = token.toUpperCase();
    const position = REPORT_POSITION[key];
    if (position === undefined) {
      unknown.push({ token, reason: 'not-a-normal-organ-tag' });
      continue;
    }
    const rule = rulesByCode.get(key);
    if (!rule) {
      unknown.push({ token, reason: 'no-rule' });
      continue;
    }
    // The same tag typed twice gives its finding once.
    if (seen.has(key)) continue;
    seen.add(key);
    findings.push({ tag: rule.code, reportPosition: position, findingsText: rule.findingsText });
  }

  // Report order: by position; the stable sort keeps typed order within a shared position.
  findings.sort((a, b) => a.reportPosition - b.reportPosition);
  return { findings, unknown };
}
