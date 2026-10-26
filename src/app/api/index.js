// Vercel serverless API. Data lives in Upstash Redis (hashes: orders, users; key: secret).
const express = require('express'), crypto = require('crypto');
const app = express();
app.use(express.json({ limit: '1mb' }));

const RURL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const RTOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const redis = async (...cmd) => {
  const r = await fetch(RURL, { method: 'POST', headers: { Authorization: 'Bearer ' + RTOK }, body: JSON.stringify(cmd) });
  const j = await r.json(); if (j.error) throw new Error(j.error); return j.result;
};
const pairs = a => { const o = []; for (let i = 0; i < (a || []).length; i += 2) o.push(JSON.parse(a[i + 1])); return o; };
const wrap = fn => (q, s, n) => Promise.resolve(fn(q, s, n)).catch(e => { console.error(e); s.sendStatus(500); });

// Admin is defined only by environment variables (ADMIN_USER / ADMIN_PASSWORD). Clients are stored in Redis.
const AU = (process.env.ADMIN_USER || 'admin').toLowerCase(), AP = process.env.ADMIN_PASSWORD || '';
const ADMIN = { username: AU, role: 'admin', customer: '' };
const sha = v => crypto.createHash('sha256').update(v).digest();
const eq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const hash = (p, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(p, salt, 32).toString('hex');
const check = (p, h) => { const [sa, x] = h.split(':'); return eq(crypto.scryptSync(p, sa, 32).toString('hex'), x); };
const pub = u => ({ username: u.username, role: u.role, customer: u.customer });
const getUser = async n => n === AU ? ADMIN : (x => (x ? JSON.parse(x) : null))(await redis('HGET', 'users', n));

let secret;
const getSecret = async () => {
  if (secret) return secret;
  secret = process.env.SESSION_SECRET || await redis('GET', 'secret');
  if (!secret) { await redis('SET', 'secret', crypto.randomBytes(32).toString('hex'), 'NX'); secret = await redis('GET', 'secret'); }
  return secret;
};
const mac = async p => crypto.createHmac('sha256', await getSecret()).update(p).digest('base64url');
const sign = async u => { const p = Buffer.from(JSON.stringify({ u: u.username, e: Date.now() + 7 * 864e5 })).toString('base64url'); return p + '.' + await mac(p); };
const verify = async t => {
  const [p, sg] = (t || '').split('.'); if (!p || !sg) return null;
  if (!eq(sg, await mac(p))) return null;
  const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.e > Date.now() ? d : null;
};

app.post('/api/login', wrap(async (q, s) => {
  const { username, password } = q.body || {};
  const n = String(username || '').trim().toLowerCase(), p = String(password || '');
  let u = null;
  if (n === AU) { if (AP && eq(p, AP)) u = ADMIN; }
  else { const x = await getUser(n); if (x && check(p, x.pass)) u = x; }
  if (!u) return s.status(401).json({ error: 'Wrong username or password' });
  s.json({ token: await sign(u), ...pub(u) });
}));

app.use('/api', wrap(async (q, s, n) => {
  const d = await verify((q.get('authorization') || '').replace('Bearer ', ''));
  const u = d && await getUser(d.u);
  if (!u) return s.sendStatus(401);
  q.user = u; n();
}));
const admin = (q, s, n) => (q.user.role === 'admin' ? n() : s.sendStatus(403));

app.get('/api/me', (q, s) => s.json(pub(q.user)));
app.get('/api/users', admin, wrap(async (q, s) => s.json([pub(ADMIN), ...pairs(await redis('HGETALL', 'users')).map(pub)])));
app.post('/api/users', admin, wrap(async (q, s) => {
  const { username, password, customer } = q.body || {};
  const name = String(username || '').trim().toLowerCase();
  if (!name || String(password || '').length < 4 || !String(customer || '').trim()) return s.sendStatus(400);
  const u = { username: name, pass: hash(String(password)), role: 'client', customer: String(customer).trim() };
  if (name === AU || !(await redis('HSETNX', 'users', name, JSON.stringify(u)))) return s.status(409).json({ error: 'exists' });
  s.json({ ok: true });
}));
app.delete('/api/users/:u', admin, wrap(async (q, s) => { await redis('HDEL', 'users', q.params.u); s.json({ ok: true }); }));

app.get('/api/orders', wrap(async (q, s) => {
  let l = pairs(await redis('HGETALL', 'orders'));
  if (q.user.role !== 'admin') l = l.filter(o => String(o.customer).toLowerCase() === q.user.customer.toLowerCase());
  s.json(l.sort((a, b) => b.created - a.created));
}));
app.put('/api/orders/:id', admin, wrap(async (q, s) => {
  const o = q.body;
  if (!o || o.id !== q.params.id) return s.sendStatus(400);
  await redis('HSET', 'orders', o.id, JSON.stringify(o)); s.json(o);
}));
app.delete('/api/orders/:id', admin, wrap(async (q, s) => { await redis('HDEL', 'orders', q.params.id); s.json({ ok: true }); }));

module.exports = app;