// The rule form's model: text fields as the user types them, converted to the API's input, and checked before sending.
// The server checks everything again; these checks only give the user a quick answer next to the field.
import { OptionKind, Rule, RuleInput, RuleOption } from '../state/rulesClient';

export interface OptionDraft {
  kind: OptionKind;
  code: string;
  minValue: string;
  maxValue: string;
  sexCode: string;
  findingsText: string;
  impressionText: string;
}

export interface RuleDraft {
  code: string;
  organ: string;
  sexCode: string;
  findingsText: string;
  impressionText: string;
  options: OptionDraft[];
}

export type Errors = Record<string, string>;

const CODE_RE = /^[A-Za-z][A-Za-z0-9 ]{0,19}$/;

export const emptyOption = (kind: OptionKind = 'side'): OptionDraft => ({
  kind, code: '', minValue: '', maxValue: '', sexCode: '', findingsText: '', impressionText: ''
});

export const emptyDraft = (): RuleDraft => ({
  code: '', organ: '', sexCode: '', findingsText: '', impressionText: '', options: []
});

const text = (v: string | null | undefined) => v ?? '';

export function draftFromRule(r: Rule): RuleDraft {
  return {
    code: r.code,
    organ: r.organ,
    sexCode: text(r.sexCode),
    findingsText: r.findingsText,
    impressionText: text(r.impressionText),
    options: r.options.map((o) => ({
      kind: o.kind,
      code: text(o.code),
      minValue: o.minValue === null ? '' : String(o.minValue),
      maxValue: o.maxValue === null ? '' : String(o.maxValue),
      sexCode: text(o.sexCode),
      findingsText: text(o.findingsText),
      impressionText: text(o.impressionText)
    }))
  };
}

const blankToNull = (s: string): string | null => (s.trim() === '' ? null : s.trim());
const numOrNull = (s: string): number | null => (s.trim() === '' ? null : Number(s));

export function toInput(d: RuleDraft): RuleInput {
  const options: RuleOption[] = d.options.map((o) => ({
    kind: o.kind,
    code: blankToNull(o.code),
    minValue: numOrNull(o.minValue),
    maxValue: numOrNull(o.maxValue),
    sexCode: blankToNull(o.sexCode),
    findingsText: blankToNull(o.findingsText),
    impressionText: blankToNull(o.impressionText),
    impressionKey: null
  }));
  return {
    code: d.code.trim(),
    organ: d.organ.trim(),
    sexCode: blankToNull(d.sexCode),
    findingsText: d.findingsText.trim(),
    impressionText: blankToNull(d.impressionText),
    impressionKey: null,
    options
  };
}

// Field keys: 'code', 'organ', 'findingsText', and 'options.<n>.<field>' for each option row.
export function validate(d: RuleDraft, isNew: boolean): Errors {
  const e: Errors = {};
  if (isNew) {
    if (!d.code.trim()) e.code = 'Enter the tag, for example Li or P.';
    else if (!CODE_RE.test(d.code.trim())) e.code = 'Start with a letter; use letters, digits or spaces (up to 20).';
  }
  if (!d.organ.trim()) e.organ = 'Enter the organ or finding group.';
  if (!d.findingsText.trim()) e.findingsText = 'Enter the findings text.';
  d.options.forEach((o, i) => {
    const key = (f: string) => `options.${i}.${f}`;
    if (o.kind === 'side' || o.kind === 'calyx') {
      if (!o.code.trim()) e[key('code')] = `Enter the ${o.kind} value.`;
    }
    if (o.kind === 'size_range') {
      const min = numOrNull(o.minValue);
      const max = numOrNull(o.maxValue);
      if (min === null || Number.isNaN(min)) e[key('minValue')] = 'Enter a number.';
      if (max === null || Number.isNaN(max)) e[key('maxValue')] = 'Enter a number.';
      if (min !== null && max !== null && !Number.isNaN(min) && !Number.isNaN(max) && min > max) e[key('maxValue')] = 'Must be at least the minimum.';
    }
    if (o.kind === 'grade' && !o.findingsText.trim()) e[key('findingsText')] = 'Enter the grade wording.';
    if (o.kind === 'sex' && !o.sexCode.trim()) e[key('sexCode')] = 'Enter a sex code (M or F).';
  });
  return e;
}
