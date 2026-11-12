// TC-011 S1 and S6 on screen: a new report saved and reopened with its header preserved, and a changed date saved and shown again.
// Uses a small in-memory fake of the reports API so that "reopen" reads back what the save stored.
import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp } from '../../src/testing/render';
import { PatientDetailsPage } from '../../src/reports/PatientDetailsPage';
import { ReportHeader } from '../../src/state/reportsClient';

type Stored = ReportHeader;
let stored: Map<number, Stored>;
let calls: { url: string; method: string; body: any }[];

beforeEach(() => {
  stored = new Map();
  calls = [];
  sessionStorage.clear();
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({ url, method, body });
    const json = (status: number, payload: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => payload }) as any;

    if (method === 'POST' && url === '/api/reports') {
      const id = 11;
      const report: Stored = {
        id, status: 'draft', srNo: null, radiologistId: 1, issuedAt: null, createdAt: 'x',
        uhid: body.uhid, name: body.name, sexCode: body.sexCode, ageText: body.ageText,
        referredBy: body.referredBy || null, reportDate: body.reportDate
      };
      stored.set(id, report);
      return json(201, { report });
    }
    const match = url.match(/^\/api\/reports\/(\d+)$/);
    if (match) {
      const report = stored.get(Number(match[1]));
      if (!report) return json(404, { error: 'not-found' });
      if (method === 'GET') return json(200, { report });
      if (method === 'PATCH') {
        const updated = { ...report, ageText: body.ageText, referredBy: body.referredBy || null, reportDate: body.reportDate };
        stored.set(report.id, updated);
        return json(200, { report: updated });
      }
    }
    return json(500, { error: 'unexpected-call' });
  });
});

const screenRoutes = (
  <Routes>
    <Route path="/reports/new" element={<PatientDetailsPage />} />
    <Route path="/reports/:id" element={<PatientDetailsPage />} />
  </Routes>
);

describe('TC-011 S1: a saved new report reopens with every header field', () => {
  it('keeps name, age, sex, title, referred by, date, UHID and Sr. No after save and reopen', async () => {
    const first = renderApp(screenRoutes, { route: '/reports/new' });
    fireEvent.change(await screen.findByLabelText(/^Name/), { target: { value: 'Ravi Kumar' } });
    fireEvent.change(screen.getByLabelText(/^Age/), { target: { value: '52' } });
    fireEvent.click(screen.getByRole('radio', { name: 'Male' }));
    fireEvent.change(screen.getByLabelText(/^Referred by/), { target: { value: 'Dr. Iyer' } });
    fireEvent.change(screen.getByLabelText(/^Date/), { target: { value: '2026-11-12' } });
    fireEvent.change(screen.getByLabelText(/^UHID NO/), { target: { value: 'UHID-11' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save patient details' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.method === 'POST')!.body).toEqual({
      uhid: 'UHID-11', name: 'Ravi Kumar', sexCode: 'M', ageText: '52 Y', referredBy: 'Dr. Iyer', reportDate: '2026-11-12'
    });
    expect(await screen.findByText('Report 11 · draft')).toBeInTheDocument();
    first.unmount();

    // Reopen the saved report from its own address, as a fresh screen.
    renderApp(screenRoutes, { route: '/reports/11' });
    expect(await screen.findByLabelText(/^Name/)).toHaveValue('Ravi Kumar');
    expect(screen.getByLabelText(/^Age/)).toHaveValue('52');
    expect(screen.getByRole('radio', { name: 'Male' })).toBeChecked();
    expect(screen.getByText('Title: MR.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Referred by/)).toHaveValue('Dr. Iyer');
    expect(screen.getByLabelText(/^Date/)).toHaveValue('2026-11-12');
    expect(screen.getByText('Shown as 12-Nov-26')).toBeInTheDocument();
    expect(screen.getByLabelText(/^UHID NO/)).toHaveValue('UHID-11');
    expect(screen.getByTestId('sr-no-value')).toHaveTextContent('Assigned when the report is issued');
    expect(calls.some((c) => c.method === 'GET' && c.url === '/api/reports/11')).toBe(true);
  });
});

describe('TC-011 S6: a changed date is saved and shown again', () => {
  it('saves the new date for a draft and shows it after reopening', async () => {
    stored.set(8, {
      id: 8, status: 'draft', srNo: null, uhid: 'UHID-8', name: 'Asha Rao', sexCode: 'F', ageText: '34 Y',
      referredBy: 'Dr. Mehta', reportDate: '2026-11-12', radiologistId: 1, issuedAt: null, createdAt: 'x'
    });

    const first = renderApp(screenRoutes, { route: '/reports/8' });
    const date = await screen.findByLabelText(/^Date/);
    expect(date).toHaveValue('2026-11-12');
    fireEvent.change(date, { target: { value: '2026-11-20' } });
    expect(screen.getByText('Shown as 20-Nov-26')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(calls.some((c) => c.method === 'PATCH')).toBe(true));
    const patch = calls.find((c) => c.method === 'PATCH')!;
    expect(patch.url).toBe('/api/reports/8');
    expect(patch.body.reportDate).toBe('2026-11-20');
    expect(await screen.findByText('Shown as 20-Nov-26')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Date/)).toHaveValue('2026-11-20');
    first.unmount();

    renderApp(screenRoutes, { route: '/reports/8' });
    expect(await screen.findByLabelText(/^Date/)).toHaveValue('2026-11-20');
    expect(screen.getByText('Shown as 20-Nov-26')).toBeInTheDocument();
  });
});
