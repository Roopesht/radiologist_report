// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
// knm:imports
import React from 'react';
import { DashboardPage } from '../dashboard/DashboardPage';
import { RulesListPage } from '../rules/RulesListPage';
import { RuleEditPage } from '../rules/RuleEditPage';
import { TagEntryPanel } from '../rules/TagEntryPanel';
import { PatientDetailsPage } from '../reports/PatientDetailsPage';

export const router = [
  // knm:entries
  { id: 'dashboard', path: '/', element: <DashboardPage /> },
  { id: 'rules-list', path: '/rules', element: <RulesListPage /> },
  { id: 'rules-new', path: '/rules/new', element: <RuleEditPage /> },
  { id: 'rules-expand', path: '/rules/expand', element: <TagEntryPanel /> },
  { id: 'rules-edit', path: '/rules/:id', element: <RuleEditPage /> },
  { id: 'reports-new', path: '/reports/new', element: <PatientDetailsPage /> },
  { id: 'reports-edit', path: '/reports/:id', element: <PatientDetailsPage /> },
  // knm:entries-end
];
