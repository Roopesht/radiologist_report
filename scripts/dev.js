// Starts the API and the web app together (`npm run dev`). Ctrl+C stops both.
//   API  http://localhost:3000   (API_PORT)   apps/api/scripts/dev-server.js -> src/http/server.ts
//   Web  http://localhost:5173   (WEB_PORT)   Vite in apps/web; /api is proxied to the API
// A port that is already in use stops the start with a message. Nothing else is killed: only the two processes started here.
const net = require('net');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const apiDir = path.join(root, 'apps', 'api');
const webDir = path.join(root, 'apps', 'web');
const apiPort = Number(process.env.API_PORT ?? 3000);
const webPort = Number(process.env.WEB_PORT ?? 5173);
const children = [];
let stopping = false;

const log = (msg) => console.log(`[dev] ${msg}`);

// True when nothing is listening on the port. Only a test listen; nothing is killed.
function portFree(port) {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.once('error', () => resolve(false));
    probe.once('listening', () => probe.close(() => resolve(true)));
    probe.listen(port);
  });
}

// Forward each line of a child's output with a name in front, so the two apps can be told apart.
function prefixLines(stream, name) {
  let pending = '';
  stream.setEncoding('utf8');
  stream.on('data', (chunk) => {
    pending += chunk;
    let i;
    while ((i = pending.indexOf('\n')) >= 0) {
      process.stdout.write(`[${name}] ${pending.slice(0, i).replace(/\r$/, '')}\n`);
      pending = pending.slice(i + 1);
    }
  });
  stream.on('end', () => {
    if (pending) process.stdout.write(`[${name}] ${pending}\n`);
  });
}

// Stop the children we started. On Windows the whole process tree of each child is ended (taskkill /T) so Vite's workers go too.
function stopChildren() {
  for (const child of children) {
    if (child.exitCode !== null || child.signalCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  }
}

function shutdown(code) {
  if (stopping) return;
  stopping = true;
  stopChildren();
  setTimeout(() => process.exit(code), 1000).unref();
  const left = () => children.some((c) => c.exitCode === null && c.signalCode === null);
  const check = setInterval(() => {
    if (!left()) {
      clearInterval(check);
      process.exit(code);
    }
  }, 100);
}

function start(name, cmd, args, options) {
  const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
  children.push(child);
  prefixLines(child.stdout, name);
  prefixLines(child.stderr, name);
  child.on('error', (err) => {
    log(`${name} could not start: ${err.message}`);
    shutdown(1);
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    log(`${name} stopped (${signal ?? `exit code ${code}`}). Stopping the other app.`);
    shutdown(code || 1);
  });
  return child;
}

async function main() {
  // Preconditions, reported before anything starts.
  const missing = [];
  if (!fs.existsSync(path.join(apiDir, 'node_modules', 'typescript', 'bin', 'tsc'))) missing.push('apps/api (run npm install there)');
  if (!fs.existsSync(path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'))) missing.push('apps/web (run npm install there)');
  if (missing.length) {
    console.error(`[dev] dependencies missing in ${missing.join(' and ')}.`);
    process.exit(1);
  }

  const busy = [];
  if (!(await portFree(apiPort))) busy.push(`API port ${apiPort} (API_PORT)`);
  if (!(await portFree(webPort))) busy.push(`web port ${webPort} (WEB_PORT)`);
  if (busy.length) {
    console.error(`[dev] cannot start: ${busy.join(' and ')} already in use, probably by another session.`);
    console.error('[dev] Stop that process, or pick free ports, e.g. API_PORT=3100 WEB_PORT=5174 npm run dev.');
    console.error('[dev] Nothing was started or stopped.');
    process.exit(1);
  }

  log(`starting API on port ${apiPort} and web on port ${webPort} ...`);
  start('api', process.execPath, [path.join(apiDir, 'scripts', 'dev-server.js')], {
    cwd: apiDir,
    env: { ...process.env, API_PORT: String(apiPort) },
  });
  start('web', process.execPath, [path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js'), '--port', String(webPort), '--strictPort'], {
    cwd: webDir,
    env: { ...process.env, PORT: String(webPort), API_URL: `http://localhost:${apiPort}` },
  });

  process.on('SIGINT', () => { log('Ctrl+C: stopping both applications ...'); shutdown(0); });
  process.on('SIGTERM', () => shutdown(0));
  process.on('SIGBREAK', () => shutdown(0));
}

main();
