const fs = require('fs');
const path = require('path');

function searchDir(dir, depth = 0) {
  if (depth > 4) return;
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        if (file === 'node_modules' || file === '.git' || file === '.next') continue;
        searchDir(fullPath, depth + 1);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.xlsx' || ext === '.xls' || ext === '.csv') {
          console.log(`Found file: ${fullPath} (Size: ${stat.size} bytes)`);
        }
      }
    }
  } catch (e) {
    // ignore
  }
}

console.log('Searching in workspace...');
searchDir('C:\\Users\\User\\.gemini\\antigravity\\scratch');
console.log('Searching in appDataDir...');
searchDir('C:\\Users\\User\\.gemini\\antigravity');
