const dns = require('dns');
const { Resolver } = dns;

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const resolver = new Resolver();
resolver.setServers(['8.8.8.8']);

const supabaseHost = requiredEnv('SUPABASE_DB_HOST');
resolver.resolveCname(supabaseHost, (err, addresses) => {
  if (err) {
    console.log('CNAME query failed:', err.message);
  } else {
    console.log('CNAME resolved to:', addresses);
  }
});
