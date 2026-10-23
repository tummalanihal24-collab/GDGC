const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const config = require('./config');
const M = require('./models');

// Loads the provided seed dataset. Safe to run repeatedly.
async function seed() {
  const data = JSON.parse(fs.readFileSync(path.join(config.seedDir, 'seed.json'), 'utf8'));
  await Promise.all(Object.values(M).map((m) => m.init()));

  await M.Setting.updateOne({ _id: 'muralRatePerSqFt' }, { value: data.mural.ratePerSqFt }, { upsert: true });
  await M.Setting.updateOne({ _id: 'currency' }, { value: data.currency }, { upsert: true });
  for (const i of data.potteryItems) await M.PotteryItem.updateOne({ _id: i.id }, { name: i.name }, { upsert: true });
  for (const g of data.glazes) await M.Glaze.updateOne({ _id: g.id }, { name: g.name }, { upsert: true });

  if (!(await M.Painting.exists({}))) {
    await M.Painting.insertMany(data.paintings.map((p) => ({
      seedId: p.id, title: p.title, artist: p.artist, description: p.description,
      price: p.price, imageUrl: '/' + p.imageUrl, status: p.status,
    })));
  }

  const s = data.studioAccount;
  if (!(await M.User.exists({ role: 'admin' }))) {
    await M.User.create({ name: 'Studio', email: s.email, passwordHash: bcrypt.hashSync(s.password, 10), role: 'admin' });
  }
}

module.exports = { seed };

if (require.main === module) {
  const mongoose = require('mongoose');
  mongoose.connect(config.mongoUri).then(seed).then(() => { console.log('Seeded'); return mongoose.disconnect(); })
    .catch((e) => { console.error(e); process.exit(1); });
}
