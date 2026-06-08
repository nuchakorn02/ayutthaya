import { NextResponse } from 'next/server';
// @ts-ignore
import { Client } from 'pg';

export async function GET() {
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

  try {
    await client.connect();
    
    // Run migrations to change columns to DOUBLE PRECISION
    await client.query('ALTER TABLE players ALTER COLUMN total_score TYPE DOUBLE PRECISION;');
    await client.query('ALTER TABLE players ALTER COLUMN starting_score TYPE DOUBLE PRECISION;');
    await client.query('ALTER TABLE players ALTER COLUMN latest_change TYPE DOUBLE PRECISION;');
    
    await client.query('ALTER TABLE score_history ALTER COLUMN old_score TYPE DOUBLE PRECISION;');
    await client.query('ALTER TABLE score_history ALTER COLUMN new_score TYPE DOUBLE PRECISION;');
    await client.query('ALTER TABLE score_history ALTER COLUMN score_diff TYPE DOUBLE PRECISION;');
    
    await client.query('ALTER TABLE import_logs ALTER COLUMN old_score TYPE DOUBLE PRECISION;');
    await client.query('ALTER TABLE import_logs ALTER COLUMN new_score TYPE DOUBLE PRECISION;');
    await client.query('ALTER TABLE import_logs ALTER COLUMN score_diff TYPE DOUBLE PRECISION;');
    
    await client.end();
    return NextResponse.json({ success: true, message: 'Database schema migrated to DOUBLE PRECISION successfully.' });
  } catch (error: any) {
    console.error('Migration API error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
