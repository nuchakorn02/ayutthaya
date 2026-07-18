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
    if (step >= 3844) {
      console.log(`Step ${step} (${obj.type}):`);
      if (obj.content) {
        console.log(obj.content.substring(0, 800) + (obj.content.length > 800 ? '...' : ''));
      }
      if (obj.tool_calls) {
        console.log('Tool calls:', JSON.stringify(obj.tool_calls));
      }
      console.log('----------------------------------------------------');
    }
  } catch (e) {
    // ignore
  }
}
