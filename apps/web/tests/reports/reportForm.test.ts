// The patient-details form model (WI-026): date display, titles, request bodies, and no Sr. No input in the model.
import { ageForApi, createBody, emptyForm, formFromReport, formatReportDate, patchBody, srNoLabel, titleFor, todayIso } from '../../src/reports/reportForm';
import type { ReportHeader } from '../../src/state/reportsClient';

const issued: ReportHeader = {
  id: 7, status: 'issued', srNo: 3, uhid: 'UHID-1', name: 'Asha Rao', sexCode: 'F', ageText: '34 Y',
  referredBy: 'Dr. Mehta', reportDate: '2026-11-12', radiologistId: 1, issuedAt: 'x', createdAt: 'x'
};
const draft: ReportHeader = { ...issued, id: 8, status: 'draft', srNo: null };

describe('date display (d-MMM-yy)', () => {
  it('shows 14-Sep-26 for 2026-09-14', () => {
    expect(formatReportDate('2026-09-14')).toBe('14-Sep-26');
  });

  it('does not pad a day below 10', () => {
    expect(formatReportDate('2027-03-01')).toBe('1-Mar-27');
  });

  it('leaves a value it cannot read unchanged', () => {
    expect(formatReportDate('12-Nov-26')).toBe('12-Nov-26');
  });

  it('takes today from the local clock as YYYY-MM-DD', () => {
    expect(todayIso(new Date(2026, 10, 12, 23, 30))).toBe('2026-11-12');
    expect(todayIso(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('titles', () => {
  it('gives MR. for male and MRS. for female', () => {
    expect(titleFor('M')).toBe('MR.');
    expect(titleFor('F')).toBe('MRS.');
  });

  it('gives no title for a sex not chosen', () => {
    expect(titleFor('')).toBeNull();
  });
});

describe('the form model', () => {
  it('has no Sr. No field: it is shown, never entered', () => {
    expect(Object.keys(emptyForm(new Date(2026, 10, 12)))).not.toContain('srNo');
    expect(Object.keys(emptyForm(new Date(2026, 10, 12)))).not.toContain('sr_no');
  });

  it('starts with today as the date', () => {
    expect(emptyForm(new Date(2026, 10, 12)).reportDate).toBe('2026-11-12');
  });

  it('sends "NN Y" and does not double a typed Y', () => {
    expect(ageForApi('34')).toBe('34 Y');
    expect(ageForApi('34 Y')).toBe('34 Y');
    expect(ageForApi('  ')).toBe('');
  });

  it('builds the POST body for a new report with M or F', () => {
    const body = createBody({ name: 'Ravi', age: '52', sexCode: 'M', referredBy: '', reportDate: '2026-11-12', uhid: 'U-9' });
    expect(body).toEqual({ uhid: 'U-9', name: 'Ravi', sexCode: 'M', ageText: '52 Y', referredBy: '', reportDate: '2026-11-12' });
  });

  it('sends only the three editable fields on a draft update', () => {
    const body = patchBody({ name: 'Changed', age: '35', sexCode: 'M', referredBy: 'Dr. X', reportDate: '2026-11-13', uhid: 'U-9' });
    expect(Object.keys(body).sort()).toEqual(['ageText', 'referredBy', 'reportDate']);
    expect(body).toEqual({ ageText: '35 Y', referredBy: 'Dr. X', reportDate: '2026-11-13' });
  });

  it('reads an API report back into the form, dropping the stored Y', () => {
    expect(formFromReport(issued)).toEqual({ name: 'Asha Rao', age: '34', sexCode: 'F', referredBy: 'Dr. Mehta', reportDate: '2026-11-12', uhid: 'UHID-1' });
  });
});

describe('Sr. No display', () => {
  it('shows no number for a draft', () => {
    expect(srNoLabel(draft)).toBe('Assigned when the report is issued');
  });

  it('shows the API value once issued', () => {
    expect(srNoLabel(issued)).toBe('3');
  });
});
