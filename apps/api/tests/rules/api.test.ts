// API tests for abbreviation rules (REQ-266): real app factory, real glue routes, JWT auth, response cache and audit middleware.
import { Server } from 'http';
import { AddressInfo } from 'net';
import { createApp } from '../../src/http/app';
import { routes } from '../../src/glue/routes';
import { providers } from '../../src/glue/providers';
import { authenticate } from '../../src/auth/authMiddleware';
import { signToken } from '../../src/auth/jwt';
import { AuditEntry, AuditSink } from '../../src/audit/auditTrail';
import { createAuditMiddleware } from '../../src/audit/auditMiddleware';
import { cacheMiddleware } from '../../src/cache/cacheMiddleware';
import { databaseProvider } from '../../src/db/provider';
import { Db } from '../../src/db/client';
import { tempDbUrl, removeTempDbs } from '../support/tempDb';

process.env.DATABASE_URL = tempDbUrl();
process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-characters-long';

const auditEntries: AuditEntry[] = [];
const sink: AuditSink = { append: (e) => { auditEntries.push(e); } };
const app = createApp({
  providers: [{ id: 'sqlite-database', register: databaseProvider }],
  middleware: [
    { id: 'jwt-auth', handler: authenticate },
    { id: 'audit-trail', handler: createAuditMiddleware(sink) },
    { id: 'memory-cache', handler: cacheMiddleware }
  ],
  routes
} as any);

let server: Server;
let base: string;
let db: Db;

const radiologistToken = () => signToken({ userId: 'rad-1', roles: ['radiologist'] });
const adminToken = () => signToken({ userId: 'admin-1', roles: ['admin'] });

async function call(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(base + path, {
    method,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const liRule = {
  code: 'Li',
  organ: 'Liver',
  findingsText: 'Liver is normal in size and shows normal echotexture.',
  impressionText: null,
  options: [{ kind: 'side', code: 'L' }]
};

beforeAll(async () => {
  server = await new Promise<Server>((resolve) => { const s = app.listen(0, () => resolve(s)); });
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  db = app.get('db') as Db;
  // the first request creates the schema (migrations run on first use); reads need no radiologist record
  await call('GET', '/api/rules', await radiologistToken());
  const now = new Date().toISOString();
  await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Radiologist', 'MD', 'Consultant', 'TEST-1', 'rad-1', now, now]
  });
  await db.execute({
    sql: 'INSERT INTO radiologists (name, qualification, designation, registration_no, user_subject, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: ['Test Admin Radiologist', 'MD', 'Consultant', 'TEST-2', 'admin-rad', now, now]
  });
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())).then(removeTempDbs));

describe('access', () => {
  it('refuses an anonymous caller', async () => {
    expect((await call('GET', '/api/rules')).status).toBe(401);
    expect((await call('POST', '/api/rules', undefined, liRule)).status).toBe(401);
  });

  it('refuses a signed-in user with neither role', async () => {
    const t = await signToken({ userId: 'reporter-1', roles: ['reporter'] });
    expect((await call('GET', '/api/rules', t)).status).toBe(403);
    expect((await call('POST', '/api/rules', t, liRule)).status).toBe(403);
  });

  it('lets a radiologist read and write', async () => {
    const list = await call('GET', '/api/rules', await radiologistToken());
    expect(list.status).toBe(200);
    expect(list.body.rules).toEqual([]);
    const created = await call('POST', '/api/rules', await radiologistToken(), liRule);
    expect(created.status).toBe(201);
    expect(created.body.rule.code).toBe('Li');
  });

  it('lets an admin read, but refuses a write from an admin with no radiologist record', async () => {
    expect((await call('GET', '/api/rules', await adminToken())).status).toBe(200);
    const res = await call('POST', '/api/rules', await adminToken(), { ...liRule, code: 'P', organ: 'Pancreas' });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('not-a-radiologist');
  });

  it('lets an admin who has a radiologist record write', async () => {
    const t = await signToken({ userId: 'admin-rad', roles: ['admin'] });
    const res = await call('POST', '/api/rules', t, { code: 'P', organ: 'Pancreas', findingsText: 'Pancreas is normal in size and echotexture.' });
    expect(res.status).toBe(201);
  });
});

describe('expansion endpoint (WI-027)', () => {
  it('refuses a signed-in user with neither role', async () => {
    const t = await signToken({ userId: 'reporter-1', roles: ['reporter'] });
    expect((await call('POST', '/api/rules/expand', t, { text: 'Li' })).status).toBe(403);
  });

  it('refuses a body whose text is not text', async () => {
    const res = await call('POST', '/api/rules/expand', await radiologistToken(), { text: 42 });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation-failed');
  });

  it('expands typed tags in report order and reports the unknown one', async () => {
    const res = await call('POST', '/api/rules/expand', await radiologistToken(), { text: 'P\nLi\nXX' });
    expect(res.status).toBe(200);
    expect(res.body.findings.map((f: { tag: string }) => f.tag)).toEqual(['Li', 'P']);
    expect(res.body.findings[0].findingsText).toBe('Liver is normal in size and shows normal echotexture.');
    expect(res.body.unknown).toEqual([{ token: 'XX', reason: 'not-a-normal-organ-tag' }]);
  });
});

describe('rules endpoints', () => {
  it('views one rule, and answers a missing or malformed id with not-found', async () => {
    const list = await call('GET', '/api/rules', await radiologistToken());
    const li = list.body.rules.find((r: any) => r.code === 'Li');
    const one = await call('GET', `/api/rules/${li.id}`, await radiologistToken());
    expect(one.status).toBe(200);
    expect(one.body.rule.options[0]).toMatchObject({ kind: 'side', code: 'L' });
    expect((await call('GET', '/api/rules/99999', await radiologistToken())).status).toBe(404);
    expect((await call('GET', '/api/rules/abc', await radiologistToken())).status).toBe(404);
  });

  it('rejects invalid input with every field named', async () => {
    const res = await call('POST', '/api/rules', await radiologistToken(), { code: '', organ: '', findingsText: 'x', options: [{ kind: 'shape' }] });
    expect(res.status).toBe(422);
    expect(res.body.error).toBe('validation-failed');
    const paths = res.body.details.map((d: any) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['code', 'organ', 'options[0].kind']));
  });

  it('rejects a body that is not an object', async () => {
    const res = await call('POST', '/api/rules', await radiologistToken(), ['not', 'an', 'object']);
    expect(res.status).toBe(422);
  });

  it('answers a duplicate code with a conflict', async () => {
    const res = await call('POST', '/api/rules', await radiologistToken(), { ...liRule, code: 'li' });
    expect(res.status).toBe(409);
  });

  it('shows an edit on the very next read (the response cache is cleared on change)', async () => {
    const token = await radiologistToken();
    const first = await call('GET', '/api/rules', token);
    const li = first.body.rules.find((r: any) => r.code === 'Li');
    const put = await call('PUT', `/api/rules/${li.id}`, token, { ...liRule, findingsText: 'Liver is enlarged.' });
    expect(put.status).toBe(200);
    expect(put.body.changed).toBe(true);
    const after = await call('GET', '/api/rules', token);
    expect(after.body.rules.find((r: any) => r.code === 'Li').findingsText).toBe('Liver is enlarged.');
  });

  it('keeps the history of a rule, one entry per saved change', async () => {
    const token = await radiologistToken();
    const list = await call('GET', '/api/rules', token);
    const li = list.body.rules.find((r: any) => r.code === 'Li');
    const h = await call('GET', `/api/rules/${li.id}/history`, token);
    expect(h.status).toBe(200);
    expect(h.body.history.map((x: any) => x.version)).toEqual([1, 2]);
    expect(h.body.history[1].changeSummary).toBe('changed: findings text');
    expect(h.body.history[0].changedBy).toBe(h.body.history[1].changedBy);
  });

  it('audits every change with the user, the action and the outcome', async () => {
    const writes = auditEntries.filter((e) => e.actor === 'rad-1');
    expect(writes.some((e) => e.action === 'POST /api/rules' && e.meta?.status === 201)).toBe(true);
    expect(writes.some((e) => e.action.startsWith('PUT /api/rules/') && e.meta?.status === 200)).toBe(true);
    expect(writes.every((e) => typeof e.at === 'string' && e.at.length > 0)).toBe(true);
  });
});
