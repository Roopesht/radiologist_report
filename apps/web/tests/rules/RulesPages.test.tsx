// Rules screens against a mocked API: the list loads from the API, the editor validates, saves and shows API errors.
import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp } from '../../src/testing/render';
import { RulesListPage } from '../../src/rules/RulesListPage';
import { RuleEditPage } from '../../src/rules/RuleEditPage';
import { Routes, Route } from 'react-router-dom';
import { Rule } from '../../src/state/rulesClient';

const liRule: Rule = {
  id: 1, code: 'Li', organ: 'Liver', sexCode: null, findingsText: 'Liver is normal in size.', impressionText: null,
  impressionKey: null, reportOrder: null, createdAt: 'x', updatedAt: 'x', options: []
};
const muRule: Rule = { ...liRule, id: 2, code: 'MML', organ: 'Mesenteric lymph nodes', findingsText: 'Mesenteric Lymphnodes are somewhat enlarged.', impressionText: 'Mild Mesenteric Lymphadenopathy.' };

type Reply = { status: number; body: unknown };
let calls: { url: string; method: string; headers: Record<string, string>; body: any }[];
let reply: (url: string, method: string) => Reply;

beforeEach(() => {
  calls = [];
  sessionStorage.clear();
  reply = () => ({ status: 200, body: { rules: [liRule, muRule] } });
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    calls.push({ url, method: init.method ?? 'GET', headers: init.headers ?? {}, body: init.body ? JSON.parse(init.body) : undefined });
    const r = reply(url, init.method ?? 'GET');
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body } as any;
  });
});

describe('rules list', () => {
  it('loads every rule from the API and shows its tag, findings and impression', async () => {
    renderApp(<RulesListPage />, { route: '/rules' });
    expect(await screen.findByText('Liver is normal in size.')).toBeInTheDocument();
    expect(screen.getByText('Mild Mesenteric Lymphadenopathy.')).toBeInTheDocument();
    expect(screen.getByText('none')).toBeInTheDocument();
    expect(calls[0]).toMatchObject({ url: '/api/rules', method: 'GET' });
    expect(calls[0].headers.authorization).toBeUndefined();
  });

  it('offers Add tag and Edit for each rule', async () => {
    renderApp(<RulesListPage />, { route: '/rules' });
    expect(await screen.findByText('Liver is normal in size.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add tag' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit Li' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit MML' })).toBeInTheDocument();
  });

  it('shows an empty state when there are no rules', async () => {
    reply = () => ({ status: 200, body: { rules: [] } });
    renderApp(<RulesListPage />, { route: '/rules' });
    expect(await screen.findByText(/No rules yet/)).toBeInTheDocument();
  });

  it('shows the user message for a refused request, never the raw code', async () => {
    reply = () => ({ status: 403, body: { error: 'forbidden' } });
    renderApp(<RulesListPage />, { route: '/rules' });
    expect(await screen.findByRole('alert')).toHaveTextContent(/cannot change rules/);
    expect(screen.queryByText('forbidden')).toBeNull();
  });

  it('sends the token the user gave for this tab with the next call', async () => {
    renderApp(<RulesListPage />, { route: '/rules' });
    await screen.findByText('Liver is normal in size.');
    fireEvent.change(screen.getByLabelText('Sign-in token'), { target: { value: 'tok-123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Use token' }));
    await waitFor(() => expect(calls.at(-1)?.headers.authorization).toBe('Bearer tok-123'));
    expect(sessionStorage.getItem('knm-rules-token')).toBe('tok-123');
  });
});

describe('rule editor', () => {
  const editorRoutes = (
    <Routes>
      <Route path="/rules" element={<p>Rules list screen</p>} />
      <Route path="/rules/new" element={<RuleEditPage />} />
      <Route path="/rules/:id" element={<RuleEditPage />} />
    </Routes>
  );

  it('shows each required field error and sends nothing when the new rule is incomplete', async () => {
    renderApp(editorRoutes, { route: '/rules/new' });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Enter the tag, for example Li or P.')).toBeInTheDocument();
    expect(screen.getByText('Enter the findings text.')).toBeInTheDocument();
    expect((global as any).fetch).not.toHaveBeenCalled();
  });

  it('creates a rule with the entered wording and an option set, then returns to the list', async () => {
    reply = (_url, method) => (method === 'POST' ? { status: 201, body: { rule: liRule } } : { status: 200, body: { rules: [] } });
    renderApp(editorRoutes, { route: '/rules/new' });
    fireEvent.change(screen.getByLabelText(/^Tag/), { target: { value: 'Li' } });
    fireEvent.change(screen.getByLabelText(/Organ or finding group/), { target: { value: 'Liver' } });
    fireEvent.change(screen.getByLabelText(/Findings text/), { target: { value: 'Liver is normal in size.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add side' }));
    fireEvent.change(screen.getByLabelText(/^Value/), { target: { value: 'L' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Rules list screen')).toBeInTheDocument();
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.url).toBe('/api/rules');
    expect(post.body).toMatchObject({ code: 'Li', organ: 'Liver', findingsText: 'Liver is normal in size.', options: [{ kind: 'side', code: 'L' }] });
  });

  it('loads a rule, saves a change with PUT and returns to the list', async () => {
    reply = (url, method) => {
      if (method === 'PUT') return { status: 200, body: { rule: liRule, changed: true } };
      return { status: 200, body: { rule: liRule } };
    };
    renderApp(editorRoutes, { route: '/rules/1' });
    const findings = await screen.findByLabelText(/Findings text/);
    expect((findings as HTMLTextAreaElement).value).toBe('Liver is normal in size.');
    fireEvent.change(findings, { target: { value: 'Liver is enlarged.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('Rules list screen')).toBeInTheDocument();
    const put = calls.find((c) => c.method === 'PUT')!;
    expect(put.url).toBe('/api/rules/1');
    expect(put.body.findingsText).toBe('Liver is enlarged.');
  });

  it('shows the API field errors next to the save message', async () => {
    reply = (_url, method) => (method === 'POST'
      ? { status: 422, body: { error: 'validation-failed', details: [{ path: 'options[0].code', message: 'is required for a side option' }] } }
      : { status: 200, body: { rules: [] } });
    renderApp(editorRoutes, { route: '/rules/new' });
    fireEvent.change(screen.getByLabelText(/^Tag/), { target: { value: 'Li' } });
    fireEvent.change(screen.getByLabelText(/Organ or finding group/), { target: { value: 'Liver' } });
    fireEvent.change(screen.getByLabelText(/Findings text/), { target: { value: 'Liver.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/Some fields need correcting/)).toBeInTheDocument();
    expect(within(alert).getByText(/options\[0\]\.code: is required for a side option/)).toBeInTheDocument();
  });

  it('explains a duplicate tag', async () => {
    reply = (_url, method) => (method === 'POST' ? { status: 409, body: { error: 'code-exists' } } : { status: 200, body: { rules: [] } });
    renderApp(editorRoutes, { route: '/rules/new' });
    fireEvent.change(screen.getByLabelText(/^Tag/), { target: { value: 'Li' } });
    fireEvent.change(screen.getByLabelText(/Organ or finding group/), { target: { value: 'Liver' } });
    fireEvent.change(screen.getByLabelText(/Findings text/), { target: { value: 'Liver.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save rule' }));
    expect(await screen.findByText('A rule with this tag already exists.')).toBeInTheDocument();
  });
});
