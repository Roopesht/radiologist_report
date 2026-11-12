// Tag entry (WI-027, REQ-268) against a mocked API: findings show in report order, unknown tags are listed, errors are shown.
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp } from '../../src/testing/render';
import { TagEntryPanel } from '../../src/rules/TagEntryPanel';

let calls: { url: string; method: string; body: any }[];
let reply: () => { status: number; body: unknown };

beforeEach(() => {
  calls = [];
  reply = () => ({
    status: 200,
    body: {
      findings: [
        { tag: 'Li', reportPosition: 2, findingsText: 'Liver is normal in size.' },
        { tag: 'P', reportPosition: 3, findingsText: 'Pancreas is normal in size.' }
      ],
      unknown: [{ token: 'XX', reason: 'not-a-normal-organ-tag' }]
    }
  });
  (global as any).fetch = jest.fn(async (url: string, init: any = {}) => {
    calls.push({ url, method: init.method ?? 'GET', body: init.body ? JSON.parse(init.body) : undefined });
    const r = reply();
    return { ok: r.status >= 200 && r.status < 300, status: r.status, json: async () => r.body } as any;
  });
});

describe('TagEntryPanel', () => {
  it('keeps Expand disabled until a tag is typed', () => {
    renderApp(<TagEntryPanel />);
    expect(screen.getByRole('button', { name: 'Expand' })).toBeDisabled();
  });

  it('sends the typed text and shows findings in the order the API gives, and lists unknown tags', async () => {
    renderApp(<TagEntryPanel />);
    fireEvent.change(screen.getByLabelText('Normal-organ tags'), { target: { value: 'P\nLi\nXX' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));

    expect(await screen.findByText('Liver is normal in size.')).toBeInTheDocument();
    expect(screen.getByText('Pancreas is normal in size.')).toBeInTheDocument();
    expect(screen.getByText('XX: not a normal-organ tag')).toBeInTheDocument();
    expect(calls).toEqual([{ url: '/api/rules/expand', method: 'POST', body: { text: 'P\nLi\nXX' } }]);
  });

  it('says when a tag has no rule yet', async () => {
    reply = () => ({ status: 200, body: { findings: [], unknown: [{ token: 'L', reason: 'no-rule' }] } });
    renderApp(<TagEntryPanel />);
    fireEvent.change(screen.getByLabelText('Normal-organ tags'), { target: { value: 'L' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(await screen.findByText('L: no rule in the abbreviation rules yet')).toBeInTheDocument();
  });

  it('shows the user message when the call fails', async () => {
    reply = () => ({ status: 403, body: { error: 'forbidden' } });
    renderApp(<TagEntryPanel />);
    fireEvent.change(screen.getByLabelText('Normal-organ tags'), { target: { value: 'Li' } });
    fireEvent.click(screen.getByRole('button', { name: 'Expand' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This account cannot change rules');
    await waitFor(() => expect(screen.queryByText('Findings')).toBeNull());
  });
});
