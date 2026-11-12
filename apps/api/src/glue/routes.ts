// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
// knm:imports
import type { Router } from 'express';
import { rulesRouter } from '../rules/rulesRouter';
import { reportsRouter } from '../reports/reportsRouter';

export const routes = [
  // knm:entries
  { id: 'abbreviation-rules', mount: (router: Router) => router.use('/api/rules', rulesRouter) },
  { id: 'patient-report-header', mount: (router: Router) => router.use('/api/reports', reportsRouter) },
  // knm:entries-end
];
