// HTTP API for the patient report header (WI-025, REQ-267). Mounted at /api/reports by the routes glue.
// Reads and writes need the role radiologist or admin. Writes also need a radiologist row for the signed-in user
// (the report records its radiologist). Sr. No is never accepted from a client: it is assigned at issue, not here.
import { NextFunction, Request, Response, Router } from 'express';
import type { AuthClaims } from '../auth/jwt';
import { requireAnyRole } from '../auth/authMiddleware';
import { cacheMiddleware } from '../cache/cacheMiddleware';
import type { Db } from '../db/client';
import { getDb } from '../db/provider';
import { radiologistIdForSubject } from '../rules/rulesStore';
import * as store from './reportsStore';

export const REPORT_ROLES = ['radiologist', 'admin'];

type Handler = (req: Request, res: Response) => Promise<void>;

// Store errors become their status and code; anything else goes to the app's error handler.
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch((err: unknown) => {
    if (err instanceof store.ReportsError) {
      res.status(err.status).json(err.details ? { error: err.code, details: err.details } : { error: err.code });
      return;
    }
    next(err);
  });
};

const dbOf = (req: Request): Db => getDb(req.app as any);

// The id in the path; anything that is not a whole number is treated as a missing report.
const idOf = (req: Request): number => {
  const raw = String(req.params.id);
  if (!/^\d+$/.test(raw)) throw new store.ReportsError(404, 'not-found');
  return Number(raw);
};

// The radiologist who makes a change: the row linked to the signed-in user. No link = no change.
async function actorOf(req: Request, db: Db): Promise<number> {
  const auth = (req as Request & { auth?: AuthClaims }).auth;
  const id = auth ? await radiologistIdForSubject(db, auth.userId) : null;
  if (id === null) throw new store.ReportsError(403, 'not-a-radiologist');
  return id;
}

// Reports are cached per user for a short time (cacheMiddleware); a saved change must show on the next read, so clear it.
const invalidateCache = () => cacheMiddleware.cache.clear();

export function createReportsRouter(): Router {
  const router = Router();
  router.use(requireAnyRole(REPORT_ROLES));

  router.get('/:id', handle(async (req, res) => {
    res.json({ report: await store.getReport(dbOf(req), idOf(req)) });
  }));

  router.post('/', handle(async (req, res) => {
    const db = dbOf(req);
    const report = await store.createDraft(db, await actorOf(req, db), req.body);
    invalidateCache();
    res.status(201).json({ report });
  }));

  router.patch('/:id', handle(async (req, res) => {
    const report = await store.updateDraft(dbOf(req), idOf(req), req.body);
    invalidateCache();
    res.json({ report });
  }));

  return router;
}

export const reportsRouter = createReportsRouter();
