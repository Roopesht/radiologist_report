// Client for the patient report header API (WI-025, REQ-267). Same origin (the dev server proxies /api to the API).
// The web holds no data rules and generates no numbers: the API validates, stores and assigns Sr. No (at issue only).
import { ApiError, getToken } from './rulesClient';

export { ApiError };

export interface ReportHeader {
  id: number;
  status: 'draft' | 'issued' | 'cancelled';
  srNo: number | null;
  uhid: string;
  name: string;
  sexCode: string;
  ageText: string;
  referredBy: string | null;
  reportDate: string;
  radiologistId: number;
  issuedAt: string | null;
  createdAt: string;
}

export interface CreateReportInput {
  uhid: string;
  name: string;
  sexCode: string;
  ageText: string;
  referredBy: string | null;
  reportDate: string;
}

export interface UpdateReportInput {
  ageText: string;
  referredBy: string | null;
  reportDate: string;
}

// The sex code of the report on screen. The tag engine reads it from here; the API stored it.
let currentSex: string | null = null;
export function setCurrentSexCode(code: string | null): void { currentSex = code; }
export function currentSexCode(): string | null { return currentSex; }

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  const token = getToken();
  if (token) headers.authorization = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'network');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, String(data?.error ?? 'error'), Array.isArray(data?.details) ? data.details : []);
  return data as T;
}

export async function getReport(id: number): Promise<ReportHeader> {
  return (await request<{ report: ReportHeader }>('GET', `/api/reports/${id}`)).report;
}

export async function createReport(input: CreateReportInput): Promise<ReportHeader> {
  return (await request<{ report: ReportHeader }>('POST', '/api/reports', input)).report;
}

export async function updateReport(id: number, input: UpdateReportInput): Promise<ReportHeader> {
  return (await request<{ report: ReportHeader }>('PATCH', `/api/reports/${id}`, input)).report;
}

// The message a user sees for a failed call. Field-level details are shown next to the field by the page.
export function reportMessageFor(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (err.status) {
    case 0: return 'The patient service cannot be reached. Check the connection and try again.';
    case 401: return 'Sign in again to enter patient details.';
    case 403:
      return err.code === 'not-a-radiologist'
        ? 'Your account is not linked to a radiologist record.'
        : 'This account cannot enter patient details.';
    case 404: return 'That report no longer exists.';
    case 409:
      return err.code === 'patient-mismatch'
        ? 'This UHID belongs to a patient with a different name or sex. Check the UHID, or the name and sex.'
        : 'This report can no longer be changed.';
    case 422: return 'Some fields need correcting. See the messages below the form.';
    default: return 'Something went wrong. Try again.';
  }
}
