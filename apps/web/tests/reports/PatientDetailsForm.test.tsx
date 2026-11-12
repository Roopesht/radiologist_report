// The patient-details screen (WI-026) against a mocked API: no Sr. No input, read-only Sr. No, titles from sex,
// POST for a new report, PATCH for a draft (three fields only), and API errors shown next to the screen.
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp } from '../../src/testing/render';
import { PatientDetailsPage } from '../../src/reports/PatientDetailsPage';
import { ReportHeader } from '../../src/state/reportsClient';

const todayText = (() => {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
})();

const draft: ReportHeader = {
  id: 8, status: 'draft', srNo: null, uhid: 'UHID-8', name: 'Asha Rao', sexCode: 'F', ageText: '34 Y',
  referredBy: 'Dr. Mehta', reportDate: '2026-11-12', radiologistId: 1, issuedAt: null, createdAt: 'x'
};
const issued: ReportHeader = { ...draft, id: 9, status: 'issued', srNo: 3, issuedAt: 'x' };

type Reply = { status: number; body: unknown };
let calls: { url: string; method: string; body: any }[];
let reply: (url: string, method: string) => Reply;

beforeEach(() => {
  calls = [];
  sessionStorage.clear();
  reply = () => ({ status: 200, body: { report: draft } });
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    const method = init.method ?? 'GET';
    calls.push({ url, method, body: init.body ? JSON.parse(init.body) : undefined });
    const r = reply(url, method);
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body } as any;
  });
});

const screenRoutes = (
  <Routes>
    <Route path="/reports/new" element={<PatientDetailsPage />} />
    <Route path="/reports/:id" element={<PatientDetailsPage />} />
  </Routes>
);

describe('the form', () => {
  it('has no Sr. No input; a new report shows the draft text', async () => {
    renderApp(screenRoutes, { route: '/reports/new' });
    expect(await screen.findByLabelText(/^Name/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: /sr\.? no/i })).toBeNull();
    expect(screen.getByTestId('sr-no-value')).toHaveTextContent('Assigned when the report is issued');
  });

  it('shows MR. for Male and MRS. for Female', async () => {
    renderApp(screenRoutes, { route: '/reports/new' });
    await screen.findByLabelText(/^Name/);
    fireEvent.click(screen.getByRole('radio', { name: 'Male' }));
    expect(screen.getByText('Title: MR.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
    expect(screen.getByText('Title: MRS.')).toBeInTheDocument();
  });

  it('shows the date as d-MMM-yy under the date input', async () => {
    renderApp(screenRoutes, { route: '/reports/new' });
    await screen.findByLabelText(/^Name/);
    expect(screen.getByText(/^Shown as \d{1,2}-[A-Z][a-z]{2}-\d{2}$/)).toBeInTheDocument();
    expect((screen.getByLabelText(/^Date/) as HTMLInputElement).value).toBe(todayText);
  });
});

describe('saved reports', () => {
  it('a draft shows no Sr. No and keeps its details editable', async () => {
    reply = () => ({ status: 200, body: { report: draft } });
    renderApp(screenRoutes, { route: '/reports/8' });
    expect(await screen.findByTestId('sr-no-value')).toHaveTextContent('Assigned when the report is issued');
    expect(screen.getByLabelText(/^Age/)).toHaveValue('34');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('an issued report shows the API Sr. No and cannot be changed here', async () => {
    reply = () => ({ status: 200, body: { report: issued } });
    renderApp(screenRoutes, { route: '/reports/9' });
    expect(await screen.findByTestId('sr-no-value')).toHaveTextContent('3');
    expect(screen.getByText('This report is issued. Its details cannot be changed here.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save changes' })).toBeNull();
  });

  it('a draft save sends only age, referred by and date', async () => {
    reply = (url, method) => (method === 'PATCH'
      ? { status: 200, body: { report: { ...draft, ageText: '35 Y' } } }
      : { status: 200, body: { report: draft } });
    renderApp(screenRoutes, { route: '/reports/8' });
    const age = await screen.findByLabelText(/^Age/);
    fireEvent.change(age, { target: { value: '35' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.url).toBe('/api/reports/8');
    expect(Object.keys(patch.body).sort()).toEqual(['ageText', 'referredBy', 'reportDate']);
    expect(patch.body.ageText).toBe('35 Y');
  });
});

describe('creating a report', () => {
  it('POSTs the entered details with M or F and no Sr. No', async () => {
    reply = (url, method) => (method === 'POST'
      ? { status: 201, body: { report: { ...draft, id: 10, sexCode: 'M', ageText: '52 Y', uhid: 'UHID-10', name: 'Ravi Kumar', referredBy: null } } }
      : { status: 200, body: { report: { ...draft, id: 10, sexCode: 'M', ageText: '52 Y', uhid: 'UHID-10', name: 'Ravi Kumar', referredBy: null } } });
    renderApp(screenRoutes, { route: '/reports/new' });
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: '52' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Male' }));
    fireEvent.change(screen.getByLabelText(/^UHID NO/), { target: { value: 'UHID-10' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save patient details' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    const post = calls.find((c) => c.method === 'POST')!;
    expect(post.url).toBe('/api/reports');
    expect(post.body).toEqual({ uhid: 'UHID-10', name: 'Ravi Kumar', sexCode: 'M', ageText: '52 Y', referredBy: '', reportDate: todayText });
    expect(post.body).not.toHaveProperty('srNo');
  });

  it('shows the mismatch message for a UHID with another name or sex, and keeps what was typed', async () => {
    reply = () => ({ status: 409, body: { error: 'patient-mismatch' } });
    renderApp(screenRoutes, { route: '/reports/new' });
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Someone Else' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Female' }));
    fireEvent.change(screen.getByLabelText(/^UHID NO/), { target: { value: 'UHID-8' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save patient details' }));
    expect(await screen.findByText(/This UHID belongs to a patient with a different name or sex/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Name/)).toHaveValue('Someone Else');
  });

  it('shows the API field message next to the field it names', async () => {
    reply = () => ({ status: 422, body: { error: 'invalid-report', details: [{ path: 'reportDate', message: 'must be a date as YYYY-MM-DD' }] } });
    renderApp(screenRoutes, { route: '/reports/new' });
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save patient details' }));
    expect(await screen.findByText('reportDate: must be a date as YYYY-MM-DD')).toBeInTheDocument();
  });
});
