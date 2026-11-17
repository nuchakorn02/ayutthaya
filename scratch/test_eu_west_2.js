const { Client } = require('pg');
const { getSupabaseDbConfig } = require('./supabase-env');

async function test(port) {
  const client = new Client(
    getSupabaseDbConfig({
      host: 'aws-0-eu-west-2.pooler.supabase.com',
      port,
    })
  );

  try {
    await client.connect();
    console.log(`Successfully connected on port ${port}!`);
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.log(`Port ${port} failed: ${err.message}`);
  }
}

async function run() {
  await test(5432);
  await test(6543);
}

run();
