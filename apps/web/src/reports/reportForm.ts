// The patient-details form's model (WI-026, REQ-267). Display and mapping only: the API validates and stores everything,
// and assigns Sr. No at issue. This file never generates or increments a number.
import type { CreateReportInput, ReportHeader, UpdateReportInput } from '../state/reportsClient';

// Form values as the user types them. There is deliberately no Sr. No field: it is shown read-only, never entered.
export interface FormValues {
  name: string;
  age: string;        // the number of years as typed; sent as "NN Y"
  sexCode: string;    // 'M' | 'F' | '' (not chosen yet)
  referredBy: string;
  reportDate: string; // YYYY-MM-DD
  uhid: string;
}

export const SEX_CHOICES = [
  { code: 'M', label: 'Male' },
  { code: 'F', label: 'Female' }
] as const;

// Display label for the title that goes with a sex. The API's sexes table holds the same values; see the plan's Assumptions.
const TITLE_FOR_SEX: Record<string, string> = { M: 'MR.', F: 'MRS.' };
export const titleFor = (sexCode: string): string | null => TITLE_FOR_SEX[sexCode] ?? null;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// YYYY-MM-DD to d-MMM-yy with a fixed English month list (not the browser locale). The day is not zero-padded.
export function formatReportDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return iso;
  return `${Number(m[3])}-${MONTHS[month - 1]}-${m[1].slice(2)}`;
}

// Today's date in the user's clock, as YYYY-MM-DD.
export function todayIso(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function emptyForm(now: Date = new Date()): FormValues {
  return { name: '', age: '', sexCode: '', referredBy: '', reportDate: todayIso(now), uhid: '' };
}

// "NN Y" as the API stores it. A typed " Y" is not doubled.
export function ageForApi(age: string): string {
  const n = age.trim().replace(/\s*y$/i, '').trim();
  return n === '' ? '' : `${n} Y`;
}

export function formFromReport(r: ReportHeader): FormValues {
  return {
    name: r.name,
    age: r.ageText.replace(/\s*Y$/i, ''),
    sexCode: r.sexCode,
    referredBy: r.referredBy ?? '',
    reportDate: r.reportDate,
    uhid: r.uhid
  };
}

// Request body for a new report (POST /api/reports).
export function createBody(v: FormValues): CreateReportInput {
  return {
    uhid: v.uhid,
    name: v.name,
    sexCode: v.sexCode,
    ageText: ageForApi(v.age),
    referredBy: v.referredBy,
    reportDate: v.reportDate
  };
}

// Request body for a draft (PATCH /api/reports/:id). Name, sex and UHID were set at creation and are not sent again.
export function patchBody(v: FormValues): UpdateReportInput {
  return { ageText: ageForApi(v.age), referredBy: v.referredBy, reportDate: v.reportDate };
}

// What the Sr. No field shows: nothing for a draft; the API's value once issued.
export const SR_NO_DRAFT_TEXT = 'Assigned when the report is issued';
export function srNoLabel(r: Pick<ReportHeader, 'srNo'>): string {
  return r.srNo === null ? SR_NO_DRAFT_TEXT : String(r.srNo);
}
