const dns = require('dns');

function requiredEnv(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const host = requiredEnv('SUPABASE_DB_HOST');
dns.lookup(host, (err, address) => {
  if (err) {
    console.log(`Failed to resolve ${host}:`, err.message);
  } else {
    console.log(`Resolved ${host} to:`, address);
  }
});
