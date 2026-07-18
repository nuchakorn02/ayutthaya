const { Client } = require('pg');

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'ap-south-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'ca-central-1', 'sa-east-1'
];

async function run() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client({
      host: host,
      port: 6543,
      user: 'postgres.omlbtybplmeryoigwmac',
      password: '1212312121',
      database: 'postgres',
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 2000
    });

    try {
      await client.connect();
      console.log(`SUCCESS: Connected via ${region}!`);
      await client.end();
      return;
    } catch (err) {
      console.log(`${region}: ${err.message}`);
    }
  }
}

run();
