const mongoose = require('mongoose');
const config = require('./config');
const { seed } = require('./seed');
const { createApp } = require('./app');

mongoose.connect(config.mongoUri)
  .then(seed)
  .then(() => createApp().listen(config.port, () => console.log(`API + site on http://localhost:${config.port}`)))
  .catch((e) => { console.error('Startup failed:', e.message); process.exit(1); });
