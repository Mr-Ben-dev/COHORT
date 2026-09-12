import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PUBLIC_TRIALS, getTrial } from './trials.mjs';
import { assertPublicOnly, PUBLIC_REFERRAL_KEYS, findPrivateFields } from './public-fields.mjs';
import { publicLog, redact } from './redact.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIR = path.resolve(__dirname, '../../web');
const ROOT = path.resolve(__dirname, '../../..');

const SECRET_ENV = /^(GITHUB_TOKEN|GH_TOKEN|RENDER_API_KEY|VERCEL_API_TOKEN|MIDNIGHT_.*SEED|.*PRIVATE_KEY|.*MNEMONIC)$/i;

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const k = line.slice(0, i).trim();
    const v = line.slice(i + 1).trim();
    if (SECRET_ENV.test(k)) continue;
    if (process.env[k] == null) process.env[k] = v;
  }
}

loadEnv();

const PORT = Number(process.env.PORT || 10000);
const HOST = process.env.HOST || '0.0.0.0';

function securityHeaders(res, extra = {}) {
  const { cache, ...httpExtra } = extra;
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self' https://indexer.preprod.midnight.network https://indexer.preview.midnight.network https://rpc.preprod.midnight.network https://rpc.preview.midnight.network wss://indexer.preprod.midnight.network wss://indexer.preview.midnight.network; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    'Cache-Control': cache || 'no-store',
    ...httpExtra,
  };
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=15552000; includeSubDomains';
  }
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
}

function allowedOrigins() {
  const raw = [process.env.CORS_ORIGIN, process.env.PUBLIC_APP_URL]
    .filter(Boolean)
    .flatMap((s) => s.split(','))
    .map((s) => s.trim())
    .filter((s) => s && s !== '*');
  return new Set(raw);
}

function setCors(req, res) {
  const origin = req.headers.origin;
  if (!origin) return true;
  let sameOrigin = false;
  try {
    sameOrigin = new URL(origin).host === req.headers.host;
  } catch {
    sameOrigin = false;
  }
  if (sameOrigin || allowedOrigins().has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'false');
    return true;
  }
  return false;
}

function send(res, status, body, cache = 'no-store') {
  securityHeaders(res, { cache });
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.statusCode = status;
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        const err = new Error('invalid json');
        err.status = 400;
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

function publicConfig() {
  return {
    networkId: process.env.MIDNIGHT_NETWORK || 'preprod',
    indexerUrl: process.env.MIDNIGHT_INDEXER_URL || '',
    indexerWsUrl: process.env.MIDNIGHT_INDEXER_WS_URL || '',
    nodeUrl: process.env.MIDNIGHT_NODE_URL || '',
    contractAddress: process.env.COHORT_CONTRACT_ADDRESS || '',
    proving: {
      goldPath: 'dapp-connector getProvingProvider (1AM in-browser WASM)',
      laceFallback: 'local proof-server on the user machine only — never COHORT servers',
      cohortNeverHostsAProofServer: true,
    },
  };
}

function handleApiFactory(publicEvents) {
  return async function handleApi(req, res, url) {
  if (req.method === 'OPTIONS') {
    if (!setCors(req, res)) return send(res, 403, { error: 'origin not allowed' });
    securityHeaders(res);
    res.statusCode = 204;
    return res.end();
  }
  if (!setCors(req, res)) return send(res, 403, { error: 'origin not allowed' });

  if (url.pathname === '/health' && req.method === 'GET') {
    return send(res, 200, { status: 'ok' }, 'no-store');
  }

  if (url.pathname === '/api/config' && req.method === 'GET') {
    return send(res, 200, publicConfig(), 'public, max-age=60');
  }

  if (url.pathname === '/api/trials' && req.method === 'GET') {
    return send(res, 200, { trials: PUBLIC_TRIALS }, 'public, max-age=300');
  }

  if (url.pathname.startsWith('/api/trials/') && req.method === 'GET') {
    const trialId = decodeURIComponent(url.pathname.slice('/api/trials/'.length));
    const trial = getTrial(trialId);
    if (!trial) return send(res, 404, { error: 'unknown trial' });
    return send(res, 200, { trial }, 'public, max-age=300');
  }

  if (url.pathname === '/api/public-state' && req.method === 'GET') {
    return send(res, 200, {
      contractAddress: process.env.COHORT_CONTRACT_ADDRESS || '',
      networkId: process.env.MIDNIGHT_NETWORK || 'preprod',
      events: publicEvents.slice(-50),
    });
  }

  if (url.pathname === '/api/referral' && req.method === 'POST') {
    const body = await readJson(req);
    assertPublicOnly(body);
    const extra = Object.keys(body).filter((k) => !PUBLIC_REFERRAL_KEYS.has(k));
    if (extra.length) {
      return send(res, 400, { error: 'unexpected fields', fields: extra });
    }
    if (!body.trialId || typeof body.trialId !== 'string') {
      return send(res, 400, { error: 'trialId required' });
    }
    if (!getTrial(body.trialId)) return send(res, 400, { error: 'unknown trial' });
    const event = {
      trialId: body.trialId,
      commitment: body.commitment || null,
      txHash: body.txHash || null,
      nullifier: body.nullifier || null,
      contractAddress: body.contractAddress || process.env.COHORT_CONTRACT_ADDRESS || '',
      networkId: body.networkId || process.env.MIDNIGHT_NETWORK || 'preprod',
      receivedAt: new Date().toISOString(),
    };
    publicEvents.push(event);
    publicLog('public referral recorded', { trialId: event.trialId, hasTx: Boolean(event.txHash) });
    return send(res, 201, { ok: true, event });
  }

  return send(res, 404, { error: 'not found' });
  };
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, url) {
  let rel = url.pathname === '/' ? '/index.html' : url.pathname;
  rel = path.normalize(rel).replace(/^[/\\]+/, '');
  const file = path.join(WEB_DIR, rel);
  if (!file.startsWith(WEB_DIR)) return send(res, 403, { error: 'forbidden' });
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404, { error: 'not found' });
  securityHeaders(res, {
    cache: rel === 'index.html' ? 'no-store' : 'public, max-age=300',
    'Content-Type': MIME[path.extname(file)] || 'application/octet-stream',
  });
  fs.createReadStream(file).pipe(res);
}

export function createServer() {
  const publicEvents = [];
  const handleApi = handleApiFactory(publicEvents);
  return http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (url.search && findPrivateFields(Object.fromEntries(url.searchParams)).length) {
        return send(res, 400, { error: 'private fields are not accepted in query' });
      }
      if (url.pathname.startsWith('/api') || url.pathname === '/health') {
        return await handleApi(req, res, url);
      }
      return serveStatic(req, res, url);
    } catch (err) {
      publicLog('request error', { status: err.status || 500, code: err.code });
      const status = err.status || 500;
      const body = { error: status === 400 ? err.message : 'internal error' };
      if (err.fields) body.fields = err.fields;
      return send(res, status, redact(body));
    }
  });
}

export function listenServer(port = 0, host = '127.0.0.1') {
  const server = createServer();
  return new Promise((resolve) => {
    server.listen(port, host, () => {
      const addr = server.address();
      resolve({ server, url: `http://${host}:${addr.port}` });
    });
  });
}

if (process.argv.includes('--check')) {
  publicLog('build check ok', { web: fs.existsSync(path.join(WEB_DIR, 'index.html')) });
  process.exit(0);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href || process.argv[1]?.endsWith('server.mjs')) {
  const server = createServer();
  server.listen(PORT, HOST, () => {
    publicLog('cohort listening', { host: HOST, port: PORT });
  });
}
