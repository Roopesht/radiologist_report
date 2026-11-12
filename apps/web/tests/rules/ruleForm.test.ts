import { emptyDraft, emptyOption, draftFromRule, toInput, validate, RuleDraft } from '../../src/rules/ruleForm';
import { Rule } from '../../src/state/rulesClient';

const draft = (over: Partial<RuleDraft> = {}): RuleDraft => ({ ...emptyDraft(), code: 'Li', organ: 'Liver', findingsText: 'Liver is normal.', ...over });

describe('rule form model', () => {
  it('accepts a complete new rule', () => {
    expect(validate(draft(), true)).toEqual({});
  });

  it('asks for the tag, organ and findings text', () => {
    const e = validate(emptyDraft(), true);
    expect(Object.keys(e).sort()).toEqual(['code', 'findingsText', 'organ']);
  });

  it('checks the tag format only for a new tag (the code is fixed once created)', () => {
    expect(validate(draft({ code: '1X' }), true).code).toMatch(/Start with a letter/);
    expect(validate(draft({ code: '1X' }), false).code).toBeUndefined();
  });

  it('checks each option row for its own required values', () => {
    const e = validate(draft({
      options: [
        { ...emptyOption('side'), code: '' },
        { ...emptyOption('size_range'), minValue: '5', maxValue: '1' },
        { ...emptyOption('size_range'), minValue: 'x', maxValue: '3' },
        { ...emptyOption('grade'), findingsText: '' },
        { ...emptyOption('sex'), sexCode: '' },
        { ...emptyOption('calyx'), code: 'u' }
      ]
    }), true);
    expect(e['options.0.code']).toBeDefined();
    expect(e['options.1.maxValue']).toMatch(/at least the minimum/);
    expect(e['options.2.minValue']).toBe('Enter a number.');
    expect(e['options.3.findingsText']).toBeDefined();
    expect(e['options.4.sexCode']).toBeDefined();
    expect(e['options.5.code']).toBeUndefined();
  });

  it('turns the draft into the API input, blank fields becoming null and numbers becoming numbers', () => {
    const input = toInput(draft({
      code: '  Li ', sexCode: '', impressionText: '   ',
      options: [{ ...emptyOption('size_range'), minValue: '14', maxValue: '15.49', sexCode: 'M' }]
    }));
    expect(input).toEqual({
      code: 'Li', organ: 'Liver', sexCode: null, findingsText: 'Liver is normal.', impressionText: null, impressionKey: null,
      options: [{ kind: 'size_range', code: null, minValue: 14, maxValue: 15.49, sexCode: 'M', findingsText: null, impressionText: null, impressionKey: null }]
    });
  });

  it('loads a saved rule into a draft and back to the same input', () => {
    const rule: Rule = {
      id: 3, code: 'P', organ: 'Pancreas', sexCode: null, findingsText: 'Pancreas is normal.', impressionText: null, impressionKey: null,
      reportOrder: null, createdAt: 'x', updatedAt: 'x',
      options: [{ kind: 'side', code: 'L', minValue: null, maxValue: null, sexCode: null, findingsText: null, impressionText: null, impressionKey: null }]
    };
    const d = draftFromRule(rule);
    expect(d.options[0]).toMatchObject({ kind: 'side', code: 'L', minValue: '' });
    expect(toInput(d)).toMatchObject({ code: 'P', findingsText: 'Pancreas is normal.', options: [{ kind: 'side', code: 'L' }] });
  });
});
