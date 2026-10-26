// Tiny API + static host. Orders are saved in DATA_DIR/orders.json so they survive restarts.
const express = require('express'), fs = require('fs'), path = require('path');
const app = express();
app.use(express.json({ limit: '1mb' }));
const DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DIR, { recursive: true });
const FILE = path.join(DIR, 'orders.json');
let orders = [];
try { orders = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch {}
const persist = () => { const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(orders)); fs.renameSync(t, FILE); };
const crypto = require('crypto');
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const writeJson = (f, v) => { fs.writeFileSync(f + '.tmp', JSON.stringify(v)); fs.renameSync(f + '.tmp', f); };
const USERS = path.join(DIR, 'users.json'), KEY = path.join(DIR, 'secret.key');
let users = readJson(USERS, []);
const SECRET = process.env.SESSION_SECRET || (fs.existsSync(KEY) ? fs.readFileSync(KEY, 'utf8') : (() => { const k = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(KEY, k); return k; })());
const hash = (p, salt = crypto.randomBytes(16).toString('hex')) => salt + ':' + crypto.scryptSync(p, salt, 32).toString('hex');
const check = (p, h) => { const [sa, x] = h.split(':'), y = crypto.scryptSync(p, sa, 32).toString('hex'); return x.length === y.length && crypto.timingSafeEqual(Buffer.from(x), Buffer.from(y)); };
// Admin account comes from environment variables.
const AU = (process.env.ADMIN_USER || 'admin').trim().toLowerCase();
const AP = process.env.ADMIN_PASSWORD;

if (!AP) {
  console.warn('ADMIN_PASSWORD is not configured.');
} else {
  const existingAdmin = users.find(u => u.role === 'admin');

  if (existingAdmin) {
    existingAdmin.username = AU;
    existingAdmin.pass = hash(AP);
  } else {
    users.push({
      username: AU,
      pass: hash(AP),
      role: 'admin',
      customer: ''
    });
  }

  writeJson(USERS, users);
}
const pub = u => ({ username: u.username, role: u.role, customer: u.customer });
const sign = u => { const p = Buffer.from(JSON.stringify({ u: u.username, e: Date.now() + 7 * 864e5 })).toString('base64url'); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('base64url'); };
const verify = t => {
  const [p, sg] = (t || '').split('.'); if (!p || !sg) return null;
  const x = crypto.createHmac('sha256', SECRET).update(p).digest('base64url');
  if (sg.length !== x.length || !crypto.timingSafeEqual(Buffer.from(sg), Buffer.from(x))) return null;
  const d = JSON.parse(Buffer.from(p, 'base64url').toString()); return d.e > Date.now() ? d : null;
};
app.post('/api/login', (q, s) => {
  const { username, password } = q.body || {};
  const u = users.find(x => x.username === String(username || '').trim().toLowerCase());
  if (!u || !check(String(password || ''), u.pass)) return s.status(401).json({ error: 'Wrong username or password' });
  s.json({ token: sign(u), ...pub(u) });
});
app.use('/api', (q, s, n) => {
  const d = verify((q.get('authorization') || '').replace('Bearer ', ''));
  const u = d && users.find(x => x.username === d.u);
  if (!u) return s.sendStatus(401);
  q.user = u; n();
});
const admin = (q, s, n) => (q.user.role === 'admin' ? n() : s.sendStatus(403));
app.get('/api/me', (q, s) => s.json(pub(q.user)));
// admin: manage client accounts (a client sees only orders whose customer name matches theirs)
app.get('/api/users', admin, (q, s) => s.json(users.map(pub)));
app.post('/api/users', admin, (q, s) => {
  const { username, password, customer } = q.body || {};
  const name = String(username || '').trim().toLowerCase();
  if (!name || String(password || '').length < 4 || !String(customer || '').trim()) return s.sendStatus(400);
  if (users.some(u => u.username === name)) return s.status(409).json({ error: 'exists' });
  users.push({ username: name, pass: hash(String(password)), role: 'client', customer: String(customer).trim() });
  writeJson(USERS, users); s.json({ ok: true });
});
app.delete('/api/users/:u', admin, (q, s) => { users = users.filter(u => u.username !== q.params.u || u.role === 'admin'); writeJson(USERS, users); s.json({ ok: true }); });
app.get('/api/orders', (q, s) => s.json(q.user.role === 'admin' ? orders : orders.filter(o => String(o.customer).toLowerCase() === q.user.customer.toLowerCase())));
app.put('/api/orders/:id', admin, (q, s) => {
  const o = q.body;
  if (!o || o.id !== q.params.id) return s.sendStatus(400);
  const i = orders.findIndex(x => x.id === o.id);
  if (i < 0) orders.unshift(o); else orders[i] = o;
  persist(); s.json(o);
});
app.delete('/api/orders/:id', admin, (q, s) => { orders = orders.filter(x => x.id !== q.params.id); persist(); s.json({ ok: true }); });
const WEB = path.join(__dirname, '..', 'dist', 'ideal-hg-sop', 'browser');
app.use(express.static(WEB));
app.use((q, s) => s.sendFile(path.join(WEB, 'index.html')));
app.listen(process.env.PORT || 3000, () => console.log('IDEAL HG SOP running on port ' + (process.env.PORT || 3000)));
