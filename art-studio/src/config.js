const fs = require('fs');
const path = require('path');

// Tiny .env loader so no extra dependency is needed.
const envFile = path.join(__dirname, '..', '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

module.exports = {
  port: Number(process.env.PORT) || 3000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'studio.db'),
  adminEmail: process.env.ADMIN_EMAIL || 'studio@example.com',
  adminPassword: process.env.ADMIN_PASSWORD || 'studio123',
  seedFile: path.join(__dirname, '..', 'data', 'seed.json'),
};
