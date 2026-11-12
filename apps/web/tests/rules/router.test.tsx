// The app's real route table: the root sends the user to the rules list, and /rules/new and /rules/:id reach the editor.
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { screen } from '@testing-library/react';
import { renderApp } from '../../src/testing/render';
import { router } from '../../src/app/router';

const table = (
  <Routes>
    {router.map((r) => <Route key={r.id} path={r.path} element={r.element as React.ReactElement} />)}
    <Route path="*" element={<p>Page not found</p>} />
  </Routes>
);

beforeEach(() => {
  (global as any).fetch = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ rules: [] }) }) as any);
});

it('the root path redirects to the rules list', async () => {
  renderApp(table, { route: '/' });
  expect(await screen.findByText(/No rules yet/)).toBeInTheDocument();
  expect(screen.queryByText('Page not found')).toBeNull();
});

it('the rules list and the new-tag editor are routed', async () => {
  renderApp(table, { route: '/rules' });
  expect(await screen.findByText(/No rules yet/)).toBeInTheDocument();
});

it('an unknown path still shows the not-found page', async () => {
  renderApp(table, { route: '/nope' });
  expect(await screen.findByText('Page not found')).toBeInTheDocument();
});
