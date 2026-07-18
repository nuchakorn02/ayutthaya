const { Client } = require('pg');

const client = new Client({
  host: '2406:da1c:61c:d601:58ad:3e19:a8c8:163f',
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
    console.log('Successfully connected to PG via direct IPv6!');
    const res = await client.query('SELECT current_database(), current_user');
    console.log('Result:', res.rows[0]);
    await client.end();
  } catch (err) {
    console.error('Failed to connect to PG via direct IPv6:', err.message);
  }
}

run();
