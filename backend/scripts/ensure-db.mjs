#!/usr/bin/env node
/**
 * Creates the CivicConnect databases (dev + test) if they do not exist yet.
 * Uses the `pg` driver against the default `postgres` maintenance database.
 */
import pg from 'pg';

const base = process.env.DATABASE_BASE_URL || 'postgresql://postgres@127.0.0.1:5443';
const targetUrl =
  process.env.DATABASE_URL || `${base}/civicconnect?schema=public`;

const dbName = (url) => new URL(url).pathname.replace(/^\//, '').split('?')[0];

const wanted = [...new Set([dbName(targetUrl), dbName(process.env.TEST_DATABASE_URL || `${base}/civicconnect_test`)])];

const client = new pg.Client({ connectionString: `${base}/postgres` });
try {
  await client.connect();
  for (const name of wanted) {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [name]);
    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${name}"`);
      console.log(`created database "${name}"`);
    } else {
      console.log(`database "${name}" already exists`);
    }
  }
} catch (err) {
  console.error('ensure-db failed:', err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
