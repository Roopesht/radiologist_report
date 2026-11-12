// HTTP API for abbreviation rules (REQ-266). Mounted at /api/rules by the routes glue.
// Reads and writes need the role radiologist or admin (enforced here). Writes also need a radiologist row for the signed-in
// user, because every saved change is recorded against a radiologist (tag_rule_history.changed_by).
import { NextFunction, Request, Response, Router } from 'express';
import type { AuthClaims } from '../auth/jwt';
import { requireAnyRole } from '../auth/authMiddleware';
import { cacheMiddleware } from '../cache/cacheMiddleware';
import type { Db } from '../db/client';
import { getDb } from '../db/provider';
import * as store from './rulesStore';
import { MAX_EXPAND_TEXT, expandTags } from './tagExpansion';

export const RULE_ROLES = ['radiologist', 'admin'];

type Handler = (req: Request, res: Response) => Promise<void>;

// Store errors become their status and code; anything else goes to the app's error handler (a 500 without details).
const handle = (fn: Handler) => (req: Request, res: Response, next: NextFunction) => {
  fn(req, res).catch((err: unknown) => {
    if (err instanceof store.RulesError) {
      res.status(err.status).json(err.details ? { error: err.code, details: err.details } : { error: err.code });
      return;
    }
    next(err);
  });
};

const dbOf = (req: Request): Db => getDb(req.app as any);

// The id in the path; anything that is not a whole number is treated as a missing rule.
const idOf = (req: Request): number => {
  const raw = String(req.params.id);
  if (!/^\d+$/.test(raw)) throw new store.RulesError(404, 'not-found');
  return Number(raw);
};

// The radiologist who makes a change: the row linked to the signed-in user. No link = no change.
async function actorOf(req: Request, db: Db): Promise<number> {
  const auth = (req as Request & { auth?: AuthClaims }).auth;
  const id = auth ? await store.radiologistIdForSubject(db, auth.userId) : null;
  if (id === null) throw new store.RulesError(403, 'not-a-radiologist');
  return id;
}

// Rules are cached per user for a short time (cacheMiddleware); a saved change must show on the next read, so clear it.
const invalidateCache = () => cacheMiddleware.cache.clear();

export function createRulesRouter(): Router {
  const router = Router();
  router.use(requireAnyRole(RULE_ROLES));

  router.get('/', handle(async (req, res) => {
    res.json({ rules: await store.listRules(dbOf(req)) });
  }));

  router.get('/:id', handle(async (req, res) => {
    res.json({ rule: await store.getRule(dbOf(req), idOf(req)) });
  }));

  router.get('/:id/history', handle(async (req, res) => {
    res.json({ history: await store.ruleHistory(dbOf(req), idOf(req)) });
  }));

  router.post('/', handle(async (req, res) => {
    const db = dbOf(req);
    const rule = await store.createRule(db, await actorOf(req, db), req.body);
    invalidateCache();
    res.status(201).json({ rule });
  }));

  // Expands typed normal-organ tags into findings in report order (WI-027). Body: { "text": "Li\nP\nXX" }.
  router.post('/expand', handle(async (req, res) => {
    const text = req.body?.text;
    if (typeof text !== 'string' || text.length > MAX_EXPAND_TEXT) {
      throw new store.RulesError(422, 'validation-failed', [{ path: 'text', message: `must be text of at most ${MAX_EXPAND_TEXT} characters` }]);
    }
    res.json(await expandTags(dbOf(req), text));
  }));

  router.put('/:id', handle(async (req, res) => {
    const db = dbOf(req);
    const result = await store.updateRule(db, await actorOf(req, db), idOf(req), req.body);
    invalidateCache();
    res.json(result);
  }));

  return router;
}

export const rulesRouter = createRulesRouter();
