const { Client } = require('pg');

async function test(port) {
  const client = new Client({
    host: 'aws-0-eu-west-2.pooler.supabase.com',
    port: port,
    user: 'postgres.omlbtybplmeryoigwmac',
    password: '1212312121',
    database: 'postgres',
    ssl: { rejectUnauthorized: false }
  });

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
