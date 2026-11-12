// Development launcher for the API. Compiles src/ (TypeScript) into node_modules/.cache/api-dev and starts the real
// server, start() in src/http/server.ts. Started by the root `npm run dev`; can also be run alone from apps/api:
//   node scripts/dev-server.js
// Settings: API_PORT (default 3000), JWT_SECRET (32+ characters, needed for sign-in), DATABASE_URL (default file:./data/app.db).
// apps/api/.env is loaded when present. Nothing here changes authentication: the server's own middleware decides.
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const apiDir = path.resolve(__dirname, '..');
const outDir = path.join(apiDir, 'node_modules', '.cache', 'api-dev');
const port = Number(process.env.API_PORT ?? 3000);

const envFile = path.join(apiDir, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const log = (msg) => console.log(`${msg}`);

// 1. Compile. A fresh output folder each start, so a deleted or renamed file never runs from an old build.
log('compiling src/ ...');
fs.rmSync(outDir, { recursive: true, force: true });
const tsc = require.resolve('typescript/bin/tsc', { paths: [apiDir] });
const compiled = spawnSync(process.execPath, [tsc, '--project', 'tsconfig.json', '--noEmit', 'false', '--outDir', outDir], {
  cwd: apiDir,
  stdio: 'inherit',
});
if (compiled.status !== 0) {
  console.error('TypeScript compile failed. Fix the errors above, then run npm run dev again.');
  process.exit(1);
}

// 2. Start the real server.
if (process.env.AUTH_ENABLED !== 'false' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  console.warn('JWT_SECRET is not set (32+ characters). Sign-in is disabled: requests with a token get 500, anonymous requests get 401.');
}

const { start } = require(path.join(outDir, 'http', 'server.js'));

start(port)
  .then((server) => {
    log(`listening on http://localhost:${port}`);
    const shutdown = () => {
      log('stopping ...');
      server.close(() => process.exit(0));
      setTimeout(() => process.exit(0), 2000).unref();
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    if (err && err.code === 'EADDRINUSE') {
      console.error(`port ${port} is already in use by another process. Stop that process, or set API_PORT to a free port.`);
    } else {
      console.error('failed to start:', err && err.message ? err.message : err);
    }
    process.exit(1);
  });
