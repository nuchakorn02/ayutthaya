const { Client } = require('pg');

const client = new Client({
  host: 'db.omlbtybplmeryoigwmac.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '1212312121',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

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
