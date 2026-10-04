/*
 * config.js | Layer: none (shared configuration)
 * Reads the environment once; every default equals the docker-compose.yml values.
 * Must NOT hold business rules or open a database connection.
 */

/**
 * Runtime settings of the API. A clean clone needs no .env file.
 * @see PDF §9.3 (database on host port 5433) and §9.4 (API on port 4000)
 */
const config = Object.freeze({
  port: Number(process.env.PORT) || 4000,
  databaseUrl:
    process.env.DATABASE_URL ||
    'postgres://kitchen_queue:kitchen_queue@localhost:5433/kitchen_queue',
  dbLog: process.env.DB_LOG === 'true',
});

module.exports = config;
