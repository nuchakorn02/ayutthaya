const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file not found');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log(`Total lines: ${lines.length}`);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  if (line.includes('Sample raw rows')) {
    console.log(`--- Line ${i + 1} matches ---`);
    try {
      const obj = JSON.parse(line);
      console.log('Step:', obj.step_index);
      console.log('Type:', obj.type);
      if (obj.content) {
        console.log(obj.content.substring(0, 3000));
      }
    } catch (e) {
      console.log('Error parsing:', e.message);
      console.log(line.substring(0, 1000));
    }
  }
}
