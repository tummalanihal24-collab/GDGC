const Database = require('better-sqlite3');
const config = require('./config');

function open(file = config.dbPath) {
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('customer','admin'))
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS pottery_items (id TEXT PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL);
    CREATE TABLE IF NOT EXISTS glazes (name TEXT PRIMARY KEY);
    CREATE TABLE IF NOT EXISTS paintings (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      price REAL NOT NULL CHECK (price > 0),
      status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','sold'))
    );
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      painting_id INTEGER NOT NULL REFERENCES paintings(id),
      price REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('placed','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- A painting can have at most one live order, enforced by the database.
    CREATE UNIQUE INDEX IF NOT EXISTS one_live_order_per_painting
      ON orders(painting_id) WHERE status = 'placed';
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      date TEXT NOT NULL,
      wall_sqft REAL NOT NULL,
      address TEXT NOT NULL,
      rate REAL NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('requested','confirmed','declined','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    -- A date can be held by at most one requested/confirmed booking.
    CREATE UNIQUE INDEX IF NOT EXISTS one_live_booking_per_date
      ON bookings(date) WHERE status IN ('requested','confirmed');
    CREATE TABLE IF NOT EXISTS pottery_requests (
      id INTEGER PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      item_id TEXT NOT NULL REFERENCES pottery_items(id),
      glaze TEXT NOT NULL REFERENCES glazes(name),
      quantity INTEGER NOT NULL,
      needed_by TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('requested','accepted','declined','cancelled')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
  return db;
}

module.exports = { open };
