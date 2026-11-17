const { Client } = require('pg');
const { getSupabaseDbConfig } = require('./supabase-env');

const client = new Client(
  getSupabaseDbConfig({
    host: process.env.SUPABASE_DB_POOLER_HOST || 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: parseInt(process.env.SUPABASE_DB_POOLER_PORT || '6543', 10),
  })
);

async function run() {
  try {
    await client.connect();
    console.log('Successfully connected to PG via pooler!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Failed to connect to PG via pooler:', err.message);
  }
}

run();
