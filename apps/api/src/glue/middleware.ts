// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
// knm:imports
import { authenticate } from '../auth/authMiddleware'; // knm:module jwt-auth
import { cacheMiddleware } from '../cache/cacheMiddleware'; // knm:module memory-cache
import { auditMiddleware } from '../audit/auditMiddleware'; // knm:module audit-trail

export const middleware = [
  // knm:entries
  { id: 'jwt-auth', handler: authenticate }, // knm:module jwt-auth
  { id: 'audit-trail', handler: auditMiddleware }, // knm:module audit-trail
  { id: 'memory-cache', handler: cacheMiddleware }, // knm:module memory-cache
  // knm:entries-end
];
