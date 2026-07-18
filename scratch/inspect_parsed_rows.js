const fs = require('fs');

const logPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file not found');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.includes('Sample raw rows') || line.includes('rawRows.slice')) {
    try {
      const obj = JSON.parse(line);
      if (obj.content && obj.content.includes('Row 1:')) {
        console.log(`Step ${obj.step_index}:`);
        console.log(obj.content);
        console.log('====================================================');
      }
    } catch (e) {
      // ignore
    }
  }
}
