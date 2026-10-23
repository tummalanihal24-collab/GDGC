const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const os = require('os');
const path = require('path');
const fs = require('fs');

const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'studio-')), 'test.db');
const { open } = require('../src/db');
const { seed } = require('../src/seed');
const { createApp } = require('../src/app');
const config = require('../src/config');

let server, base;
const iso = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);

async function call(method, url, token, body) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const signup = async (email) => (await call('POST', '/api/auth/signup', null, { name: email, email, password: 'secret1' })).body.token;

let admin, alice, bob;
before(async () => {
  const db = open(dbFile);
  seed(db);
  server = createApp(db).listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = (await call('POST', '/api/auth/login', null, { email: config.adminEmail, password: config.adminPassword })).body.token;
  alice = await signup('alice@x.com');
  bob = await signup('bob@x.com');
});
after(() => server.close());

test('401 without login, 403 for wrong role', async () => {
  assert.equal((await call('GET', '/api/paintings')).status, 401);
  assert.equal((await call('POST', '/api/paintings', alice, { title: 't', price: 5 })).status, 403);
  assert.equal((await call('POST', '/api/orders', admin, { paintingId: 1 })).status, 403);
  assert.equal((await call('POST', '/api/bookings/1/confirm', alice)).status, 403);
});

test('a painting can only be bought once; cancelling frees it', async () => {
  const [a, b] = await Promise.all([
    call('POST', '/api/orders', alice, { paintingId: 1 }),
    call('POST', '/api/orders', bob, { paintingId: 1 }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const winner = a.status === 201 ? [alice, a] : [bob, b];
  const loser = a.status === 201 ? bob : alice;
  assert.equal((await call('PUT', '/api/paintings/1', admin, { title: 'x', price: 9 })).status, 409);
  assert.equal((await call('POST', `/api/orders/${winner[1].body.id}/cancel`, loser)).status, 404);
  assert.equal((await call('POST', `/api/orders/${winner[1].body.id}/cancel`, winner[0])).status, 200);
  assert.equal((await call('POST', '/api/orders', loser, { paintingId: 1 })).status, 201);
});

test('a wall date can only be booked once; rules and pricing', async () => {
  const body = (d) => ({ date: iso(d), wallSqft: 100, address: '1 Main St' });
  assert.equal((await call('POST', '/api/bookings', alice, body(6))).status, 400);
  assert.equal((await call('POST', '/api/bookings', alice, body(91))).status, 400);
  assert.equal((await call('POST', '/api/bookings', alice, { ...body(10), wallSqft: 9 })).status, 400);
  const [a, b] = await Promise.all([
    call('POST', '/api/bookings', alice, body(10)),
    call('POST', '/api/bookings', bob, body(10)),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const ok = a.status === 201 ? a : b;
  assert.equal(ok.body.price, 100 * ok.body.rate);
  const owner = a.status === 201 ? alice : bob, other = a.status === 201 ? bob : alice;
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/cancel`, other)).status, 404);
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/confirm`, admin)).body.status, 'confirmed');
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/decline`, admin)).status, 409);
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/cancel`, owner)).body.status, 'cancelled');
  // the freed date can be booked again
  assert.equal((await call('POST', '/api/bookings', other, body(10))).status, 201);
});

test('customers cannot cancel a booking within 3 days', async () => {
  const db = open(dbFile);
  const user = db.prepare(`SELECT id FROM users WHERE email='alice@x.com'`).get();
  const r = db.prepare(`INSERT INTO bookings (user_id,date,wall_sqft,address,rate,price,status) VALUES (?,?,?,?,?,?, 'requested')`)
    .run(user.id, iso(2), 50, 'a', 40, 2000);
  assert.equal((await call('POST', `/api/bookings/${r.lastInsertRowid}/cancel`, alice)).status, 409);
});

test('pottery request lifecycle', async () => {
  const good = { itemId: 'mug', glaze: 'Celadon', quantity: 4, neededBy: iso(20) };
  assert.equal((await call('POST', '/api/pottery', alice, { ...good, neededBy: iso(13) })).status, 400);
  assert.equal((await call('POST', '/api/pottery', alice, { ...good, quantity: 13 })).status, 400);
  assert.equal((await call('POST', '/api/pottery', alice, { ...good, glaze: 'nope' })).status, 400);
  const r = await call('POST', '/api/pottery', alice, good);
  assert.equal(r.status, 201);
  assert.equal((await call('PUT', `/api/pottery/${r.body.id}`, bob, good)).status, 404);
  assert.equal((await call('PUT', `/api/pottery/${r.body.id}`, alice, { ...good, quantity: 6 })).body.quantity, 6);
  assert.equal((await call('POST', `/api/pottery/${r.body.id}/accept`, admin)).body.status, 'accepted');
  assert.equal((await call('PUT', `/api/pottery/${r.body.id}`, alice, good)).status, 409);
  assert.equal((await call('POST', `/api/pottery/${r.body.id}/cancel`, alice)).status, 409);
  assert.equal((await call('GET', '/api/pottery', bob)).body.length, 0);
  assert.ok((await call('GET', '/api/pottery', admin)).body.length >= 1);
});
