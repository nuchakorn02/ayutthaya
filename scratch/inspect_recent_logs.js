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
  try {
    const obj = JSON.parse(line);
    const step = obj.step_index;
    if (step >= 3800 && step <= 3850) {
      if (line.includes('Division Context Updated') || line.includes('Extracted Player') || line.includes('chong3556')) {
        console.log(`Step ${step} (${obj.type}):`);
        // If content is too long, look for the part where it logs chong3556 and print surrounding 1000 characters
        if (obj.content) {
          const idx = obj.content.indexOf('chong3556');
          if (idx !== -1) {
            console.log(obj.content.substring(Math.max(0, idx - 1000), Math.min(obj.content.length, idx + 1000)));
          } else {
            console.log(obj.content.substring(0, 1000));
          }
        }
        console.log('====================================================');
      }
    }
  } catch (e) {
    // ignore
  }
}
