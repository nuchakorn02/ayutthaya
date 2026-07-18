const { Client } = require('pg');
const dns = require('dns');

const regions = [
  'ap-southeast-1', 'ap-southeast-2', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3', 'ap-south-1',
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'ca-central-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-central-1', 'eu-central-2',
  'sa-east-1', 'af-south-1'
];

async function checkHost(region) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  return new Promise((resolve) => {
    dns.lookup(host, async (err, address) => {
      if (err) {
        resolve({ region, host, status: 'dns_failed', error: err.message });
        return;
      }
      
      // Try connecting
      const client = new Client({
        host: host,
        port: 5432,
        user: 'postgres.omlbtybplmeryoigwmac',
        password: '1212312121',
        database: 'postgres',
        ssl: { rejectUnauthorized: false },
        connectionTimeoutMillis: 3000
      });
      
      try {
        await client.connect();
        await client.end();
        resolve({ region, host, status: 'success' });
      } catch (connErr) {
        resolve({ region, host, status: 'conn_failed', error: connErr.message });
      }
    });
  });
}

async function run() {
  const results = await Promise.all(regions.map(r => checkHost(r)));
  results.forEach(res => {
    if (res.status === 'success') {
      console.log(`FOUND ACTIVE REGION: ${res.region}`);
    } else if (res.status === 'conn_failed' && !res.error.includes('tenant/user postgres.omlbtybplmeryoigwmac not found')) {
      console.log(`Region ${res.region} responded with different error: ${res.error}`);
    } else if (res.status === 'success' || res.status === 'conn_failed') {
      console.log(`Region ${res.region}: ${res.error}`);
    }
  });
}

run();
