const fs = require('fs');
const path = require('path');

const tasksDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\.system_generated\\tasks';
const files = fs.readdirSync(tasksDir);

files.forEach((file) => {
  const fullPath = path.join(tasksDir, file);
  try {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('chong3556')) {
      console.log(`Found chong3556 in: ${file} (Size: ${content.length} characters)`);
    }
  } catch (e) {
    // ignore
  }
});
