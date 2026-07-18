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
  if (line.includes('--- IMPORT DEBUG ---')) {
    console.log(`--- Line ${i + 1} contains IMPORT DEBUG ---`);
    try {
      const obj = JSON.parse(line);
      // Let's print the content of the step
      console.log('STEP INDEX:', obj.step_index);
      console.log('TYPE:', obj.type);
      console.log('CONTENT SUMMARY:', obj.content ? obj.content.substring(0, 2000) : 'No content');
    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log(line.substring(0, 1000));
    }
  }
}
