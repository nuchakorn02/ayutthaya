const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\tasks';
if (!fs.existsSync(tasksDir)) {
  console.log('Tasks dir not found');
  process.exit(1);
}

const files = fs.readdirSync(tasksDir);

files.forEach((file) => {
  const fullPath = path.join(tasksDir, file);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('แต้มวัลลภเอาจริง.xlsx')) {
      console.log(`Found in: ${file}`);
      // Find lines containing chong3556 or Extracted Player or Division Context Updated
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('chong3556') || line.includes('Division Context') || line.includes('Extracted Player') || line.includes('แต้มวัลลภเอาจริง.xlsx')) {
          console.log(`[Line ${idx + 1}] ${line.trim()}`);
        }
      });
      console.log('====================================================');
    }
  } catch (e) {
    // ignore
  }
});
