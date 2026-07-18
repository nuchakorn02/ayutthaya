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
    console.log('Connected to PostgreSQL database');
    
    // Add reason column if it does not exist
    await client.query('ALTER TABLE score_history ADD COLUMN IF NOT EXISTS reason TEXT;');
    console.log('Successfully added reason column to score_history table');
    
    await client.end();
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

run();
