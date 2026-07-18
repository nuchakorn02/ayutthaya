const fs = require('fs');

const logPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file not found');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    // Find where next.js log output shows chong3556 or rawRows or any console output from the import
    if (obj.content && obj.content.includes('chong3556') && obj.content.includes('[Row')) {
      console.log(`Step ${obj.step_index} contains Row/chong3556:`);
      console.log(obj.content);
      console.log('====================================================');
    }
  } catch (e) {
    // ignore
  }
}
