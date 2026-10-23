const fs = require('fs');
const path = require('path');

// Tiny .env loader (looks in server/ then the project root).
for (const dir of [path.join(__dirname, '..'), path.join(__dirname, '..', '..')]) {
  const file = path.join(dir, '.env');
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

module.exports = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/art-studio',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  seedDir: path.join(__dirname, '..', 'seed'),
  clientDist: path.join(__dirname, '..', '..', 'client', 'dist'),
};
