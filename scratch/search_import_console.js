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
    if (obj.content && obj.content.includes('chong3556')) {
      // Find any occurrences of the console output from the import logic
      const content = obj.content;
      const idx = content.indexOf('chong3556');
      if (content.includes('[Row') || content.includes('Extracted Player')) {
        console.log(`Step ${obj.step_index} matches console log:`);
        // Find the block of logs around chong3556
        const linesOfContent = content.split('\n');
        linesOfContent.forEach((cLine) => {
          if (cLine.includes('chong3556') || cLine.includes('Extracted Player') || cLine.includes('Division Context')) {
            console.log(cLine);
          }
        });
        console.log('====================================================');
      }
    }
  } catch (e) {
    // ignore
  }
}
