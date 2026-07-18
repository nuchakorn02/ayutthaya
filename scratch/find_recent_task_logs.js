const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\tasks';
if (!fs.existsSync(tasksDir)) {
  console.log('Tasks dir not found');
  process.exit(1);
}

const files = fs.readdirSync(tasksDir);
const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

files.forEach((file) => {
  const fullPath = path.join(tasksDir, file);
  const stat = fs.statSync(fullPath);
  const age = now - stat.mtimeMs;
  if (age < oneDayMs * 2) { // last 48 hours
    console.log(`File: ${file} | Size: ${stat.size} bytes | Modified: ${stat.mtime}`);
  }
});
