const { Client } = require('pg');
const { getSupabaseDbConfig } = require('./supabase-env');

const client = new Client(getSupabaseDbConfig());

async function run() {
  try {
    await client.connect();
    console.log('Successfully connected to PG!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Failed to connect to PG:', err.message);
  }
}

run();
