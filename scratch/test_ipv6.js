const { Client } = require('pg');
const { getSupabaseDbConfig } = require('./supabase-env');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const client = new Client(
  getSupabaseDbConfig({ host: requiredEnv('SUPABASE_DB_IPV6_HOST') })
);

async function run() {
  try {
    await client.connect();
    console.log('Successfully connected to PG via direct IPv6!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Failed to connect to PG via direct IPv6:', err.message);
  }
}

run();
