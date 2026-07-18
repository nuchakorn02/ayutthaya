const dns = require('dns');
const { Resolver } = dns;
const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);

resolver.resolveCname('db.omlbtybplmeryoigwmac.supabase.co', (err, addresses) => {
  if (err) {
    console.log('CNAME query failed:', err.message);
  } else {
    console.log('CNAME resolved to:', addresses);
  }
});
