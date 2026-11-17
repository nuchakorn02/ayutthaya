const { Client } = require('pg');
const { getSupabaseDbConfig } = require('./supabase-env');

const regions = [
  'ap-southeast-1', // Singapore
  'ap-southeast-2', // Sydney
  'ap-northeast-1', // Tokyo
  'ap-northeast-2', // Seoul
  'ap-south-1',     // Mumbai
  'us-east-1',      // N. Virginia
  'us-east-2',      // Ohio
  'us-west-1',      // N. California
  'us-west-2',      // Oregon
  'eu-west-1',      // Ireland
  'eu-west-2',      // London
  'eu-west-3',      // Paris
  'eu-central-1',   // Frankfurt
  'ca-central-1',   // Canada Central
  'sa-east-1'       // Sao Paulo
];

async function tryRegion(region) {
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
    return true;
  } catch (err) {
    if (err.message.includes(`tenant/user ${process.env.SUPABASE_DB_USER || 'postgres'} not found`)) {
      // Host reached, but user not here
      console.log(`${region}: User not found`);
    } else {
      console.log(`${region}: Error - ${err.message}`);
    }
    return false;
  }
}

async function run() {
  for (const r of regions) {
    const ok = await tryRegion(r);
    if (ok) {
      console.log(`Found correct region: ${r}`);
      break;
    }
  }
}

run();
