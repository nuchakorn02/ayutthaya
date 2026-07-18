const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543, // Transaction pooler
  user: 'postgres.omlbtybplmeryoigwmac',
  password: '1212312121',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

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
