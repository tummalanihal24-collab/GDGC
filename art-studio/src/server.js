const config = require('./config');
const { open } = require('./db');
const { seed } = require('./seed');
const { createApp } = require('./app');

const db = open();
seed(db);
createApp(db).listen(config.port, () => console.log(`Art studio running at http://localhost:${config.port}`));
