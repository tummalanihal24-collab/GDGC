const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const M = require('../src/models');
const { seed } = require('../src/seed');
const { createApp } = require('../src/app');

let mongod, server, base, admin, alice, bob, paintings;
const iso = (d) => new Date(Date.now() + 5.5 * 3600000 + d * 86400000).toISOString().slice(0, 10);

async function call(method, url, token, body) {
  const res = await fetch(base + url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const signup = async (email) => (await call('POST', '/api/auth/signup', null, { name: email, email, password: 'secret1' })).body.token;

before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await seed();
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}`;
  admin = (await call('POST', '/api/auth/login', null, { email: 'studio@artstudio.in', password: 'Studio@123' })).body.token;
  alice = await signup('alice@x.com');
  bob = await signup('bob@x.com');
  paintings = (await call('GET', '/api/paintings', alice)).body;
});
after(async () => { server.close(); await mongoose.disconnect(); await mongod.stop(); });

test('seed data is loaded', () => {
  assert.equal(paintings.length, 12);
  assert.equal(paintings.filter((p) => p.status === 'sold').length, 2);
});

test('401 without login, 403 for wrong role', async () => {
  const free = paintings.find((p) => p.status === 'available');
  assert.equal((await call('GET', '/api/paintings')).status, 401);
  assert.equal((await call('POST', '/api/paintings', alice, { title: 't', price: 5 })).status, 403);
  assert.equal((await call('POST', '/api/orders', admin, { paintingId: free.id })).status, 403);
  assert.equal((await call('POST', `/api/bookings/${free.id}/confirm`, alice)).status, 403);
});

test('a painting can only be bought once; cancelling frees it', async () => {
  const p = paintings.find((x) => x.status === 'available');
  const sold = paintings.find((x) => x.status === 'sold');
  assert.equal((await call('POST', '/api/orders', alice, { paintingId: sold.id })).status, 409);
  const [a, b] = await Promise.all([
    call('POST', '/api/orders', alice, { paintingId: p.id }),
    call('POST', '/api/orders', bob, { paintingId: p.id }),
  ]);
  assert.deepEqual([a.status, b.status].sort(), [201, 409]);
  const [winner, win, loser] = a.status === 201 ? [alice, a, bob] : [bob, b, alice];
  assert.equal((await call('PUT', `/api/paintings/${p.id}`, admin, { title: 'x', price: 9 })).status, 409);
  assert.equal((await call('POST', `/api/orders/${win.body.id}/cancel`, loser)).status, 404);
  assert.equal((await call('POST', `/api/orders/${win.body.id}/cancel`, winner)).status, 200);
  assert.equal((await call('PUT', `/api/paintings/${p.id}`, admin, { title: 'Renamed', price: 9 })).status, 200);
  assert.equal((await call('POST', '/api/orders', loser, { paintingId: p.id })).status, 201);
  assert.equal((await call('GET', '/api/orders', winner)).body.length, 1);
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
  assert.equal(ok.body.price, 100 * 150);
  const [owner, other] = a.status === 201 ? [alice, bob] : [bob, alice];
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/cancel`, other)).status, 404);
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/confirm`, admin)).body.status, 'confirmed');
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/decline`, admin)).status, 409);
  assert.equal((await call('POST', `/api/bookings/${ok.body.id}/cancel`, owner)).body.status, 'cancelled');
  assert.equal((await call('POST', '/api/bookings', other, body(10))).status, 201); // freed date
});

test('customers cannot cancel a booking within 3 days', async () => {
  const alis = await M.User.findOne({ email: 'alice@x.com' });
  const b = await M.Booking.create({ user: alis.id, date: iso(2), wallSqft: 50, address: 'a', rate: 150, price: 7500, status: 'requested' });
  assert.equal((await call('POST', `/api/bookings/${b.id}/cancel`, alice)).status, 409);
});

test('pottery request lifecycle', async () => {
  const good = { itemId: 'i-01', glazeId: 'g-01', quantity: 4, neededBy: iso(20) };
  assert.equal((await call('POST', '/api/pottery', alice, { ...good, neededBy: iso(13) })).status, 400);
  assert.equal((await call('POST', '/api/pottery', alice, { ...good, quantity: 13 })).status, 400);
  assert.equal((await call('POST', '/api/pottery', alice, { ...good, glazeId: 'nope' })).status, 400);
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
