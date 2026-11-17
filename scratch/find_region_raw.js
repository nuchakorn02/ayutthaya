const { Client } = require('pg');
const { getSupabaseDbConfig } = require('./supabase-env');

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2',
  'ap-south-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'ca-central-1', 'sa-east-1'
];

async function run() {
  for (const region of regions) {
    const host = `aws-0-${region}.pooler.supabase.com`;
    const client = new Client(
      getSupabaseDbConfig({
        host,
        port: 6543,
        connectionTimeoutMillis: 2000,
      })
    );

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
