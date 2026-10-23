const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');

const DAY = 86400000;
// Dates are calendar days (YYYY-MM-DD) compared in UTC.
const today = () => Math.floor(Date.now() / DAY);
const dayNumber = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) ? Math.floor(Date.parse(s) / DAY) : null);

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (m) => new HttpError(400, m);
const notFound = (m = 'Not found') => new HttpError(404, m);
const conflict = (m) => new HttpError(409, m);

function createApp(db) {
  const app = express();
  app.use(express.json());

  // ---- auth middleware -------------------------------------------------
  const auth = (req, _res, next) => {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next(new HttpError(401, 'Login required'));
    try {
      const { id } = jwt.verify(token, config.jwtSecret);
      // Role is read from the database on every request, never trusted from the token.
      const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(id);
      if (!user) return next(new HttpError(401, 'Login required'));
      req.user = user;
      next();
    } catch {
      next(new HttpError(401, 'Invalid or expired token'));
    }
  };
  const role = (r) => (req, _res, next) =>
    req.user.role === r ? next() : next(new HttpError(403, `Only ${r} accounts can do this`));
  const customer = [auth, role('customer')];
  const admin = [auth, role('admin')];

  const tokenFor = (u) => jwt.sign({ id: u.id }, config.jwtSecret, { expiresIn: '7d' });
  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });
  const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
  const id = (req) => {
    const n = Number(req.params.id);
    if (!Number.isInteger(n)) throw notFound();
    return n;
  };

  // ---- accounts: sign-up always creates a customer ---------------------
  app.post('/api/auth/signup', (req, res) => {
    const name = str(req.body.name, 100), email = str(req.body.email, 200).toLowerCase(), password = req.body.password;
    if (!name) throw bad('Name is required');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw bad('A valid email is required');
    if (typeof password !== 'string' || password.length < 6) throw bad('Password must be at least 6 characters');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) throw conflict('That email is already registered');
    const r = db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'customer')`)
      .run(name, email, bcrypt.hashSync(password, 10));
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(r.lastInsertRowid);
    res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
  });

  app.post('/api/auth/login', (req, res) => {
    const email = str(req.body.email, 200).toLowerCase();
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || typeof req.body.password !== 'string' || !bcrypt.compareSync(req.body.password, user.password_hash)) {
      throw new HttpError(401, 'Wrong email or password');
    }
    res.json({ token: tokenFor(user), user: publicUser(user) });
  });

  app.get('/api/me', auth, (req, res) => res.json(publicUser(req.user)));

  // ---- reference (seed) data ------------------------------------------
  app.get('/api/catalog', auth, (_req, res) => {
    res.json({
      wallRatePerSqft: Number(db.prepare(`SELECT value FROM settings WHERE key='wallRatePerSqft'`).get().value),
      potteryItems: db.prepare('SELECT id, name, price FROM pottery_items ORDER BY name').all(),
      glazes: db.prepare('SELECT name FROM glazes ORDER BY name').all().map((g) => g.name),
    });
  });

  // ---- paintings -------------------------------------------------------
  app.get('/api/paintings', auth, (_req, res) => {
    res.json(db.prepare('SELECT * FROM paintings ORDER BY id DESC').all());
  });

  const paintingFields = (body) => {
    const title = str(body.title, 200), price = Number(body.price);
    if (!title) throw bad('Title is required');
    if (!(price > 0)) throw bad('Price must be greater than 0');
    return { title, artist: str(body.artist, 200), description: str(body.description, 1000), price };
  };

  app.post('/api/paintings', admin, (req, res) => {
    const p = paintingFields(req.body);
    const r = db.prepare('INSERT INTO paintings (title, artist, description, price) VALUES (?,?,?,?)')
      .run(p.title, p.artist, p.description, p.price);
    res.status(201).json(db.prepare('SELECT * FROM paintings WHERE id = ?').get(r.lastInsertRowid));
  });

  app.put('/api/paintings/:id', admin, (req, res) => {
    const pid = id(req), p = paintingFields(req.body);
    // The status check is part of the UPDATE, so a painting sold a moment ago cannot be edited.
    const r = db.prepare(`UPDATE paintings SET title=?, artist=?, description=?, price=? WHERE id=? AND status='available'`)
      .run(p.title, p.artist, p.description, p.price, pid);
    if (!r.changes) {
      if (!db.prepare('SELECT 1 FROM paintings WHERE id = ?').get(pid)) throw notFound('Painting not found');
      throw conflict('Only available paintings can be edited');
    }
    res.json(db.prepare('SELECT * FROM paintings WHERE id = ?').get(pid));
  });

  // ---- orders ----------------------------------------------------------
  const ownOrDie = (table, req) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id(req));
    // Someone else's record looks exactly like a missing one.
    if (!row || (req.user.role === 'customer' && row.user_id !== req.user.id)) throw notFound();
    return row;
  };
  const listFor = (table, req, order = 'id DESC') =>
    req.user.role === 'admin'
      ? db.prepare(`SELECT t.*, u.name AS customer_name, u.email AS customer_email FROM ${table} t JOIN users u ON u.id = t.user_id ORDER BY t.${order}`).all()
      : db.prepare(`SELECT * FROM ${table} WHERE user_id = ? ORDER BY ${order}`).all(req.user.id);

  app.get('/api/orders', auth, (req, res) => {
    const rows = listFor('orders', req);
    const titles = new Map(db.prepare('SELECT id, title FROM paintings').all().map((p) => [p.id, p.title]));
    res.json(rows.map((o) => ({ ...o, painting_title: titles.get(o.painting_id) })));
  });

  app.post('/api/orders', customer, (req, res) => {
    const pid = Number(req.body.paintingId);
    if (!Number.isInteger(pid)) throw bad('paintingId is required');
    const buy = db.transaction(() => {
      // Atomic claim: only one caller can flip available -> sold.
      const claimed = db.prepare(`UPDATE paintings SET status='sold' WHERE id=? AND status='available'`).run(pid);
      if (!claimed.changes) {
        if (!db.prepare('SELECT 1 FROM paintings WHERE id = ?').get(pid)) throw notFound('Painting not found');
        throw conflict('Sorry, this painting has just been sold');
      }
      const p = db.prepare('SELECT price FROM paintings WHERE id = ?').get(pid);
      const r = db.prepare(`INSERT INTO orders (user_id, painting_id, price, status) VALUES (?,?,?, 'placed')`)
        .run(req.user.id, pid, p.price);
      return r.lastInsertRowid;
    });
    res.status(201).json(db.prepare('SELECT * FROM orders WHERE id = ?').get(buy()));
  });

  app.post('/api/orders/:id/cancel', customer, (req, res) => {
    const o = ownOrDie('orders', req);
    db.transaction(() => {
      const r = db.prepare(`UPDATE orders SET status='cancelled' WHERE id=? AND status='placed'`).run(o.id);
      if (!r.changes) throw conflict('Order is already cancelled');
      db.prepare(`UPDATE paintings SET status='available' WHERE id=?`).run(o.painting_id);
    })();
    res.json(db.prepare('SELECT * FROM orders WHERE id = ?').get(o.id));
  });

  // ---- wall bookings ---------------------------------------------------
  app.get('/api/bookings', auth, (req, res) => res.json(listFor('bookings', req, 'date ASC')));

  // Dates held by a requested/confirmed booking (no customer details), so the UI can grey them out.
  app.get('/api/bookings/taken-dates', auth, (_req, res) => {
    res.json(db.prepare(`SELECT date FROM bookings WHERE status IN ('requested','confirmed') ORDER BY date`).all().map((r) => r.date));
  });

  app.post('/api/bookings', customer, (req, res) => {
    const dn = dayNumber(req.body.date);
    if (dn === null) throw bad('Date must be YYYY-MM-DD');
    const away = dn - today();
    if (away < 7 || away > 90) throw bad('Date must be between 7 and 90 days from today');
    const sqft = Number(req.body.wallSqft);
    if (!(sqft >= 10 && sqft <= 500)) throw bad('Wall size must be between 10 and 500 sq ft');
    const address = str(req.body.address);
    if (!address) throw bad('Address is required');
    const rate = Number(db.prepare(`SELECT value FROM settings WHERE key='wallRatePerSqft'`).get().value);
    try {
      const r = db.prepare(`INSERT INTO bookings (user_id, date, wall_sqft, address, rate, price, status) VALUES (?,?,?,?,?,?, 'requested')`)
        .run(req.user.id, req.body.date, sqft, address, rate, Math.round(sqft * rate * 100) / 100);
      res.status(201).json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(r.lastInsertRowid));
    } catch (e) {
      // The unique index is the real guard against two people taking one date.
      if (String(e.code).startsWith('SQLITE_CONSTRAINT')) throw conflict('Sorry, that date has just been taken');
      throw e;
    }
  });

  app.post('/api/bookings/:id/cancel', customer, (req, res) => {
    const b = ownOrDie('bookings', req);
    if (!['requested', 'confirmed'].includes(b.status)) throw conflict(`A ${b.status} booking cannot be cancelled`);
    if (dayNumber(b.date) - today() < 3) throw conflict('Bookings can only be cancelled until 3 days before the date');
    db.prepare(`UPDATE bookings SET status='cancelled' WHERE id=? AND status IN ('requested','confirmed')`).run(b.id);
    res.json(db.prepare('SELECT * FROM bookings WHERE id = ?').get(b.id));
  });

  const decide = (table, allowed) => (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id(req));
    if (!row) throw notFound();
    const next = allowed[req.params.action];
    if (!next) throw notFound();
    const r = db.prepare(`UPDATE ${table} SET status=? WHERE id=? AND status='requested'`).run(next, row.id);
    if (!r.changes) throw conflict(`Only requested items can be changed; this one is ${row.status}`);
    res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(row.id));
  };
  app.post('/api/bookings/:id/:action', admin, decide('bookings', { confirm: 'confirmed', decline: 'declined' }));

  // ---- pottery requests ------------------------------------------------
  const potteryFields = (body) => {
    const item = db.prepare('SELECT * FROM pottery_items WHERE id = ?').get(String(body.itemId));
    if (!item) throw bad('Choose a valid item');
    if (!db.prepare('SELECT 1 FROM glazes WHERE name = ?').get(String(body.glaze))) throw bad('Choose a valid glaze');
    const quantity = Number(body.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 12) throw bad('Quantity must be a whole number from 1 to 12');
    const dn = dayNumber(body.neededBy);
    if (dn === null) throw bad('Needed-by date must be YYYY-MM-DD');
    if (dn - today() < 14) throw bad('Needed-by date must be at least 14 days away');
    return { itemId: item.id, glaze: String(body.glaze), quantity, neededBy: body.neededBy };
  };

  app.get('/api/pottery', auth, (req, res) => {
    const rows = listFor('pottery_requests', req);
    const names = new Map(db.prepare('SELECT id, name FROM pottery_items').all().map((i) => [i.id, i.name]));
    res.json(rows.map((r) => ({ ...r, item_name: names.get(r.item_id) })));
  });

  app.post('/api/pottery', customer, (req, res) => {
    const f = potteryFields(req.body);
    const r = db.prepare(`INSERT INTO pottery_requests (user_id, item_id, glaze, quantity, needed_by, status) VALUES (?,?,?,?,?, 'requested')`)
      .run(req.user.id, f.itemId, f.glaze, f.quantity, f.neededBy);
    res.status(201).json(db.prepare('SELECT * FROM pottery_requests WHERE id = ?').get(r.lastInsertRowid));
  });

  app.put('/api/pottery/:id', customer, (req, res) => {
    const row = ownOrDie('pottery_requests', req);
    const f = potteryFields(req.body);
    const r = db.prepare(`UPDATE pottery_requests SET item_id=?, glaze=?, quantity=?, needed_by=? WHERE id=? AND status='requested'`)
      .run(f.itemId, f.glaze, f.quantity, f.neededBy, row.id);
    if (!r.changes) throw conflict('Only requests that are still "requested" can be edited');
    res.json(db.prepare('SELECT * FROM pottery_requests WHERE id = ?').get(row.id));
  });

  app.post('/api/pottery/:id/cancel', customer, (req, res) => {
    const row = ownOrDie('pottery_requests', req);
    const r = db.prepare(`UPDATE pottery_requests SET status='cancelled' WHERE id=? AND status='requested'`).run(row.id);
    if (!r.changes) throw conflict('Only requests that are still "requested" can be cancelled');
    res.json(db.prepare('SELECT * FROM pottery_requests WHERE id = ?').get(row.id));
  });

  app.post('/api/pottery/:id/:action', admin, decide('pottery_requests', { accept: 'accepted', decline: 'declined' }));

  // ---- static UI + errors ---------------------------------------------
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.use('/api', (_req, _res, next) => next(notFound('No such endpoint')));

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
