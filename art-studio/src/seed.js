const fs = require('fs');
const bcrypt = require('bcryptjs');
const config = require('./config');

// Idempotent: safe to run on every start.
function seed(db) {
  const data = JSON.parse(fs.readFileSync(config.seedFile, 'utf8'));
  db.transaction(() => {
    db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('wallRatePerSqft', ?)`).run(String(data.wallRatePerSqft));
    for (const p of data.potteryItems) {
      db.prepare(`INSERT OR REPLACE INTO pottery_items (id, name, price) VALUES (?,?,?)`).run(p.id, p.name, p.price);
    }
    for (const g of data.glazes) db.prepare(`INSERT OR IGNORE INTO glazes (name) VALUES (?)`).run(g);
    if (!db.prepare('SELECT 1 FROM paintings').get()) {
      for (const p of data.paintings) {
        db.prepare(`INSERT INTO paintings (title, artist, description, price) VALUES (?,?,?,?)`)
          .run(p.title, p.artist || '', p.description || '', p.price);
      }
    }
    if (!db.prepare(`SELECT 1 FROM users WHERE role='admin'`).get()) {
      db.prepare(`INSERT INTO users (name, email, password_hash, role) VALUES (?,?,?, 'admin')`)
        .run('Studio', config.adminEmail.toLowerCase(), bcrypt.hashSync(config.adminPassword, 10));
    }
  })();
}

module.exports = { seed };

if (require.main === module) {
  const db = require('./db').open();
  seed(db);
  console.log(`Seeded ${config.dbPath}. Studio login: ${config.adminEmail}`);
}
