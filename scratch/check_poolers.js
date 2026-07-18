const dns = require('dns');

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

regions.forEach(region => {
  const host = `aws-0-${region}.pooler.supabase.com`;
  dns.lookup(host, (err, address) => {
    if (!err) {
      console.log(`RESOLVED ${host} -> ${address}`);
    }
  });
});
