const fs = require('fs');
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('./config');
const M = require('./models');

const DAY = 86400000;
const IST = 5.5 * 3600000;
// The studio works in India: "today" and all dates are IST calendar days (YYYY-MM-DD).
const today = () => Math.floor((Date.now() + IST) / DAY);
const dayNumber = (s) => {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const t = Date.parse(s + 'T00:00:00Z');
  return !isNaN(t) && new Date(t).toISOString().slice(0, 10) === s ? t / DAY : null;
};

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const bad = (m) => new HttpError(400, m);
const notFound = (m = 'Not found') => new HttpError(404, m);
const conflict = (m) => new HttpError(409, m);
const str = (v, max = 500) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const oid = (v) => { if (!mongoose.isValidObjectId(v)) throw notFound(); return v; };

function createApp() {
  const app = express();
  app.use(express.json());
  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

  // ---- auth ------------------------------------------------------------
  const auth = wrap(async (req, _res, next) => {
    const h = req.headers.authorization || '';
    if (!h.startsWith('Bearer ')) throw new HttpError(401, 'Login required');
    let id;
    try { id = jwt.verify(h.slice(7), config.jwtSecret).id; } catch { throw new HttpError(401, 'Invalid or expired token'); }
    // Role comes from the database on every request, never from the token.
    const user = mongoose.isValidObjectId(id) && (await M.User.findById(id));
    if (!user) throw new HttpError(401, 'Login required');
    req.user = user;
    next();
  });
  const role = (r) => (req, _res, next) =>
    req.user.role === r ? next() : next(new HttpError(403, `Only ${r} accounts can do this`));
  const customer = [auth, role('customer')];
  const admin = [auth, role('admin')];
  const isAdmin = (req) => req.user.role === 'admin';

  const tokenFor = (u) => jwt.sign({ id: u.id }, config.jwtSecret, { expiresIn: '7d' });
  const session = (u) => ({ token: tokenFor(u), user: { id: u.id, name: u.name, email: u.email, role: u.role } });

  app.post('/api/auth/signup', wrap(async (req, res) => {
    const name = str(req.body.name, 100), email = str(req.body.email, 200).toLowerCase(), password = req.body.password;
    if (!name) throw bad('Name is required');
    if (!/^\S+@\S+\.\S+$/.test(email)) throw bad('A valid email is required');
    if (typeof password !== 'string' || password.length < 6) throw bad('Password must be at least 6 characters');
    try {
      const u = await M.User.create({ name, email, passwordHash: bcrypt.hashSync(password, 10), role: 'customer' });
      res.status(201).json(session(u));
    } catch (e) {
      if (e.code === 11000) throw conflict('That email is already registered');
      throw e;
    }
  }));

  app.post('/api/auth/login', wrap(async (req, res) => {
    const u = await M.User.findOne({ email: str(req.body.email, 200).toLowerCase() });
    if (!u || typeof req.body.password !== 'string' || !bcrypt.compareSync(req.body.password, u.passwordHash)) {
      throw new HttpError(401, 'Wrong email or password');
    }
    res.json(session(u));
  }));

  app.get('/api/me', auth, (req, res) => res.json(req.user));

  // ---- seed reference data --------------------------------------------
  app.get('/api/catalog', auth, wrap(async (_req, res) => {
    const [rate, cur, items, glazes] = await Promise.all([
      M.Setting.findById('muralRatePerSqFt'), M.Setting.findById('currency'),
      M.PotteryItem.find().sort('name'), M.Glaze.find().sort('name'),
    ]);
    res.json({ muralRatePerSqFt: rate.value, currency: cur.value, potteryItems: items, glazes });
  }));

  // ---- paintings -------------------------------------------------------
  app.get('/api/paintings', auth, wrap(async (_req, res) => res.json(await M.Painting.find().sort('seedId _id'))));

  const paintingFields = (b) => {
    const title = str(b.title, 200), price = Number(b.price);
    if (!title) throw bad('Title is required');
    if (!(price > 0)) throw bad('Price must be greater than 0');
    return { title, artist: str(b.artist, 200), description: str(b.description, 1000), price };
  };

  app.post('/api/paintings', admin, wrap(async (req, res) => res.status(201).json(await M.Painting.create(paintingFields(req.body)))));

  app.put('/api/paintings/:id', admin, wrap(async (req, res) => {
    const id = oid(req.params.id), f = paintingFields(req.body);
    // The status check is part of the update, so a painting sold a moment ago can't be edited.
    const p = await M.Painting.findOneAndUpdate({ _id: id, status: 'available' }, f, { new: true });
    if (p) return res.json(p);
    throw (await M.Painting.exists({ _id: id })) ? conflict('Only available paintings can be edited') : notFound('Painting not found');
  }));

  // ---- shared helpers for customer-owned records -----------------------
  // Missing and someone-else's records are indistinguishable: both 404.
  const mine = (req) => (isAdmin(req) ? {} : { user: req.user.id });
  async function owned(Model, req) {
    const row = await Model.findOne({ _id: oid(req.params.id), ...mine(req) });
    if (!row) throw notFound();
    return row;
  }
  const withUser = (q, req) => (isAdmin(req) ? q.populate('user', 'name email') : q);

  // ---- orders ----------------------------------------------------------
  app.get('/api/orders', auth, wrap(async (req, res) => {
    res.json(await withUser(M.Order.find(mine(req)).sort('-createdAt').populate('painting', 'title imageUrl'), req));
  }));

  app.post('/api/orders', customer, wrap(async (req, res) => {
    const pid = oid(req.body.paintingId);
    // Atomic claim: of any number of simultaneous buyers, exactly one flips available -> sold.
    const painting = await M.Painting.findOneAndUpdate({ _id: pid, status: 'available' }, { status: 'sold' });
    if (!painting) throw (await M.Painting.exists({ _id: pid })) ? conflict('Sorry, this painting has just been sold') : notFound('Painting not found');
    try {
      res.status(201).json(await M.Order.create({ user: req.user.id, painting: pid, price: painting.price, status: 'placed' }));
    } catch (e) {
      await M.Painting.updateOne({ _id: pid }, { status: 'available' }); // don't leave it stuck as sold
      throw e;
    }
  }));

  app.post('/api/orders/:id/cancel', customer, wrap(async (req, res) => {
    const o = await owned(M.Order, req);
    const done = await M.Order.findOneAndUpdate({ _id: o.id, status: 'placed' }, { status: 'cancelled' }, { new: true });
    if (!done) throw conflict('Order is already cancelled');
    await M.Painting.updateOne({ _id: o.painting }, { status: 'available' });
    res.json(done);
  }));

  // ---- wall bookings ---------------------------------------------------
  app.get('/api/bookings', auth, wrap(async (req, res) => res.json(await withUser(M.Booking.find(mine(req)).sort('date'), req))));

  // Dates held by a live booking (no customer details) so the form can mark them.
  app.get('/api/bookings/taken-dates', auth, wrap(async (_req, res) => {
    res.json((await M.Booking.find({ live: true }).sort('date').select('date')).map((b) => b.date));
  }));

  app.post('/api/bookings', customer, wrap(async (req, res) => {
    const dn = dayNumber(req.body.date);
    if (dn === null) throw bad('Date must be YYYY-MM-DD');
    const away = dn - today();
    if (away < 7 || away > 90) throw bad('Date must be between 7 and 90 days from today');
    const sqft = Number(req.body.wallSqft);
    if (!(sqft >= 10 && sqft <= 500)) throw bad('Wall size must be between 10 and 500 sq ft');
    const address = str(req.body.address);
    if (!address) throw bad('Address is required');
    const rate = (await M.Setting.findById('muralRatePerSqFt')).value;
    try {
      res.status(201).json(await M.Booking.create({
        user: req.user.id, date: req.body.date, wallSqft: sqft, address, rate, price: sqft * rate, status: 'requested',
      }));
    } catch (e) {
      // The partial unique index on live bookings is the real guard against double-booking a date.
      if (e.code === 11000) throw conflict('Sorry, that date has just been taken');
      throw e;
    }
  }));

  app.post('/api/bookings/:id/cancel', customer, wrap(async (req, res) => {
    const b = await owned(M.Booking, req);
    if (!['requested', 'confirmed'].includes(b.status)) throw conflict(`A ${b.status} booking cannot be cancelled`);
    if (dayNumber(b.date) - today() < 3) throw conflict('Bookings can only be cancelled until 3 days before the date');
    const done = await M.Booking.findOneAndUpdate({ _id: b.id, status: { $in: ['requested', 'confirmed'] } },
      { status: 'cancelled', live: false }, { new: true });
    if (!done) throw conflict('Booking has already changed');
    res.json(done);
  }));

  const decide = (Model, actions) => wrap(async (req, res) => {
    const next = actions[req.params.action];
    if (!next) throw notFound();
    const row = await Model.findById(oid(req.params.id));
    if (!row) throw notFound();
    const set = { status: next };
    if (Model === M.Booking && next !== 'confirmed') set.live = false; // frees the date
    const done = await Model.findOneAndUpdate({ _id: row.id, status: 'requested' }, set, { new: true });
    if (!done) throw conflict(`Only requested items can be changed; this one is ${row.status}`);
    res.json(done);
  });
  app.post('/api/bookings/:id/:action', admin, decide(M.Booking, { confirm: 'confirmed', decline: 'declined' }));

  // ---- pottery requests ------------------------------------------------
  const potteryFields = async (b) => {
    if (!(await M.PotteryItem.exists({ _id: String(b.itemId) }))) throw bad('Choose a valid item');
    if (!(await M.Glaze.exists({ _id: String(b.glazeId) }))) throw bad('Choose a valid glaze');
    const quantity = Number(b.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 12) throw bad('Quantity must be a whole number from 1 to 12');
    const dn = dayNumber(b.neededBy);
    if (dn === null) throw bad('Needed-by date must be YYYY-MM-DD');
    if (dn - today() < 14) throw bad('Needed-by date must be at least 14 days away');
    return { item: String(b.itemId), glaze: String(b.glazeId), quantity, neededBy: b.neededBy };
  };
  const populatePottery = (q) => q.populate('item', 'name').populate('glaze', 'name');

  app.get('/api/pottery', auth, wrap(async (req, res) => {
    res.json(await withUser(populatePottery(M.PotteryRequest.find(mine(req)).sort('-createdAt')), req));
  }));

  app.post('/api/pottery', customer, wrap(async (req, res) => {
    const f = await potteryFields(req.body);
    res.status(201).json(await M.PotteryRequest.create({ ...f, user: req.user.id, status: 'requested' }));
  }));

  app.put('/api/pottery/:id', customer, wrap(async (req, res) => {
    const r = await owned(M.PotteryRequest, req);
    const f = await potteryFields(req.body);
    const done = await M.PotteryRequest.findOneAndUpdate({ _id: r.id, status: 'requested' }, f, { new: true });
    if (!done) throw conflict('Only requests that are still "requested" can be edited');
    res.json(done);
  }));

  app.post('/api/pottery/:id/cancel', customer, wrap(async (req, res) => {
    const r = await owned(M.PotteryRequest, req);
    const done = await M.PotteryRequest.findOneAndUpdate({ _id: r.id, status: 'requested' }, { status: 'cancelled' }, { new: true });
    if (!done) throw conflict('Only requests that are still "requested" can be cancelled');
    res.json(done);
  }));

  app.post('/api/pottery/:id/:action', admin, decide(M.PotteryRequest, { accept: 'accepted', decline: 'declined' }));

  // ---- images, built React app, errors ------------------------------------
  app.use('/images', express.static(path.join(config.seedDir, 'images')));
  app.use('/api', (_req, _res, next) => next(notFound('No such endpoint')));
  if (fs.existsSync(config.clientDist)) {
    app.use(express.static(config.clientDist));
    app.get('/{*splat}', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  }

  app.use((err, _req, res, _next) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  });

  return app;
}

module.exports = { createApp };
