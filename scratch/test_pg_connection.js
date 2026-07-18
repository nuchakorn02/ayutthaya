const { Client } = require('pg');

async function testConnection(host) {
  const client = new Client({
    host: host,
    port: 5432,
    user: 'postgres.omlbtybplmeryoigwmac',
    password: '1212312121',
    database: 'postgres',
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log(`Successfully connected to ${host}`);
    const res = await client.query('SELECT current_database();');
    console.log('Query result:', res.rows);
    await client.end();
    return true;
  } catch (error) {
    console.log(`Failed to connect to ${host}:`, error.message);
    return false;
  }
}

async function run() {
  const regions = [
    'ap-southeast-1',
    'ap-southeast-2',
    'ap-northeast-1',
    'us-east-1',
    'us-east-2',
    'us-west-1',
    'eu-central-1',
    'eu-west-1'
  ];
  
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const success = await testConnection(host);
    if (success) {
      console.log(`Found active region: ${region}`);
      break;
    }
  }
}

run();
