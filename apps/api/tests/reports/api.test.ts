// API tests for the patient report header (WI-025, REQ-267): real app factory, real glue routes, JWT auth.
import { Server } from 'http';
import { AddressInfo } from 'net';
import { createApp } from '../../src/http/app';
import { routes } from '../../src/glue/routes';
import { providers } from '../../src/glue/providers';
import { authenticate } from '../../src/auth/authMiddleware';
import { signToken } from '../../src/auth/jwt';
import { cacheMiddleware } from '../../src/cache/cacheMiddleware';
import { databaseProvider } from '../../src/db/provider';
import { Db } from '../../src/db/client';
import { tempDbUrl, removeTempDbs } from '../support/tempDb';

process.env.DATABASE_URL = tempDbUrl();
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const app = createApp({
  providers: [{ id: 'sqlite-database', register: databaseProvider }],
  middleware: [
    { id: 'jwt-auth', handler: authenticate },
    { id: 'memory-cache', handler: cacheMiddleware }
  ],
  routes
} as any);

let server: Server;
let base: string;
let db: Db;

const radiologistToken = () => signToken({ userId: 'rad-1', roles: ['radiologist'] });

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const header = {
  uhid: 'UHID-API-1',
  name: 'Ravi Kumar',
  sexCode: 'M',
  ageText: '52 Y',
  referredBy: 'Dr. Iyer',
  reportDate: '2026-11-12'
};

beforeAll(async () => {
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  db = app.get('db') as Db;
  // the first request creates the schema (migrations run on first use)
  await call('GET', '/api/reports/1', await radiologistToken());
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Radiologist', 'MD', 'Consultant', 'TEST-1', 'rad-1', now, now]
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())).then(removeTempDbs));

describe('access', () => {
  it('refuses an anonymous caller', async () => {
    expect((await call('POST', '/api/reports', undefined, header)).status).toBe(401);
    expect((await call('GET', '/api/reports/1')).status).toBe(401);
  });

  it('refuses a signed-in user without the radiologist or admin role', async () => {
    const t = await signToken({ userId: 'reporter-1', roles: ['reporter'] });
    expect((await call('POST', '/api/reports', t, header)).status).toBe(403);
  });

  it('refuses a radiologist-role user who has no radiologist record', async () => {
    const t = await signToken({ userId: 'no-record', roles: ['radiologist'] });
    const r = await call('POST', '/api/reports', t, { ...header, uhid: 'UHID-NOREC' });
    expect(r.status).toBe(403);
    expect(r.body.error).toBe('not-a-radiologist');
  });
});

describe('draft report', () => {
  let reportId: number;

  it('creates a draft with sex M and no Sr. No', async () => {
    const r = await call('POST', '/api/reports', await radiologistToken(), header);
    expect(r.status).toBe(201);
    expect(r.body.report.status).toBe('draft');
    expect(r.body.report.sexCode).toBe('M');
    expect(r.body.report.srNo).toBeNull();
    reportId = r.body.report.id;
  });

  it('reads back the sex value for the tag engine', async () => {
    const r = await call('GET', `/api/reports/${reportId}`, await radiologistToken());
    expect(r.status).toBe(200);
    expect(r.body.report.sexCode).toBe('M');
    expect(r.body.report.uhid).toBe('UHID-API-1');
    expect(r.body.report.srNo).toBeNull();
  });

  it('refuses a sex value other than the known codes', async () => {
    const r = await call('POST', '/api/reports', await radiologistToken(), { ...header, uhid: 'UHID-API-2', sexCode: 'X' });
    expect(r.status).toBe(422);
    expect(r.body.error).toBe('invalid-report');
  });

  it('ignores a client-sent Sr. No on update', async () => {
    const r = await call('PATCH', `/api/reports/${reportId}`, await radiologistToken(), { ageText: '53 Y', srNo: 42 });
    expect(r.status).toBe(200);
    expect(r.body.report.ageText).toBe('53 Y');
    expect(r.body.report.srNo).toBeNull();
  });

  it('returns 404 for an unknown report', async () => {
    const r = await call('GET', '/api/reports/999999', await radiologistToken());
    expect(r.status).toBe(404);
  });
});
