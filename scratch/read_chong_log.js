const fs = require('fs');

const logPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\tasks\\task-3324.log';
if (!fs.existsSync(logPath)) {
  console.log('Log file not found');
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');
console.log(`Total lines in task log: ${lines.length}`);

lines.forEach((line, idx) => {
  if (line.includes('chong3556')) {
    console.log(`--- MATCH AT LINE ${idx + 1} ---`);
    const start = Math.max(0, idx - 15);
    const end = Math.min(lines.length - 1, idx + 15);
    for (let i = start; i <= end; i++) {
      console.log(`${i + 1}: ${lines[i].trim()}`);
    }
    console.log('----------------------------------------------------');
  }
});
