const fs = require('fs');

const logPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file not found');
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log('Searching all lines for "Division Context Updated"...');

for (let i = lines.length - 1; i >= 0; i--) {
  const line = lines[i].trim();
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (line.includes('Division Context Updated') || line.includes('rawRows.slice')) {
      console.log(`Step ${obj.step_index} (${obj.type}) [${obj.created_at || 'No date'}]:`);
      if (obj.content) {
        // Print the matches or surrounding context
        console.log(obj.content.substring(0, 2000));
      } else if (obj.tool_calls) {
        console.log('Tool calls:', JSON.stringify(obj.tool_calls));
      }
      console.log('----------------------------------------------------');
    }
  } catch (e) {
    // ignore
  }
}
