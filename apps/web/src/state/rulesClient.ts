// Client for the abbreviation rules API (REQ-266). Same origin in the app (the dev server proxies /api to the API).
// Sign-in: the API expects a bearer token (JWT) of a radiologist or admin. The token is kept for the browser tab only
// (sessionStorage) and is never sent anywhere but the API.

export type OptionKind = 'size_range' | 'calyx' | 'side' | 'grade' | 'sex';
export const OPTION_KINDS: OptionKind[] = ['side', 'calyx', 'size_range', 'grade', 'sex'];

export interface RuleOption {
  kind: OptionKind;
  code: string | null;
  minValue: number | null;
  maxValue: number | null;
  sexCode: string | null;
  findingsText: string | null;
  impressionText: string | null;
  impressionKey: string | null;
}

export interface Rule {
  id: number;
  code: string;
  organ: string;
  sexCode: string | null;
  findingsText: string;
  impressionText: string | null;
  impressionKey: string | null;
  reportOrder: number | null;
  options: RuleOption[];
  createdAt: string;
  updatedAt: string;
}

export interface RuleInput {
  code: string;
  organ: string;
  sexCode: string | null;
  findingsText: string;
  impressionText: string | null;
  impressionKey: string | null;
  options: RuleOption[];
}

export interface FieldError { path: string; message: string }

export class ApiError extends Error {
  constructor(readonly status: number, readonly code: string, readonly details: FieldError[] = []) {
    super(code);
  }
}

const TOKEN_KEY = 'knm-rules-token';

export function getToken(): string {
  try { return sessionStorage.getItem(TOKEN_KEY) ?? ''; } catch { return ''; }
}

export function setToken(token: string): void {
  try {
    if (token.trim()) sessionStorage.setItem(TOKEN_KEY, token.trim());
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch { /* storage blocked: the token is simply not kept */ }
}

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

export async function listRules(): Promise<Rule[]> {
  return (await request<{ rules: Rule[] }>('GET', '/api/rules')).rules;
}

export async function getRule(id: number): Promise<Rule> {
  return (await request<{ rule: Rule }>('GET', `/api/rules/${id}`)).rule;
}

export async function createRule(input: RuleInput): Promise<Rule> {
  return (await request<{ rule: Rule }>('POST', '/api/rules', input)).rule;
}

export async function updateRule(id: number, input: RuleInput): Promise<Rule> {
  return (await request<{ rule: Rule }>('PUT', `/api/rules/${id}`, input)).rule;
}

// Normal-organ tag expansion (WI-027, REQ-268). Findings come back in report order; unknown tags are reported, never dropped.
export interface ExpandedFinding {
  tag: string;
  reportPosition: number;
  findingsText: string;
}

export interface UnknownTag {
  token: string;
  reason: 'not-a-normal-organ-tag' | 'no-rule';
}

export interface ExpansionResult {
  findings: ExpandedFinding[];
  unknown: UnknownTag[];
}

export async function expandTags(text: string): Promise<ExpansionResult> {
  return request<ExpansionResult>('POST', '/api/rules/expand', { text });
}

// The message a user sees for a failed call. Field-level details are shown next to the form by the caller.
export function messageFor(err: unknown): string {
  if (!(err instanceof ApiError)) return 'Something went wrong. Try again.';
  switch (err.status) {
    case 0: return 'The rules service cannot be reached. Check the connection and try again.';
    case 401: return 'Sign in with a radiologist or admin token to manage rules.';
    case 403: return 'This account cannot change rules. Rules need a radiologist or admin role, and a radiologist record for changes.';
    case 404: return 'That rule no longer exists.';
    case 409: return 'A rule with this tag already exists.';
    case 422: return 'Some fields need correcting. See the messages below the form.';
    default: return 'Something went wrong. Try again.';
  }
}
