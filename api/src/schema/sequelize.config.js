/*
 * sequelize.config.js | Layer: Schema
 * Connection settings for sequelize-cli (migrations and seed), taken from config.js.
 * Must NOT define models or hold credentials of its own.
 */
const config = require('../config');

const settings = {
  url: config.databaseUrl,
  dialect: 'postgres',
  logging: config.dbLog ? console.log : false,
};

// sequelize-cli picks a key by NODE_ENV; this project has one database, so all keys match.
module.exports = { development: settings, test: settings, production: settings };
