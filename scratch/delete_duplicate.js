const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../src/app/api/admin/imports/%5Bid%5D');

if (fs.existsSync(targetDir)) {
  console.log('Target directory exists. Deleting recursively:', targetDir);
  fs.rmSync(targetDir, { recursive: true, force: true });
  console.log('Deleted successfully!');
} else {
  console.log('Target directory does not exist:', targetDir);
}
