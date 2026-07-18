const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\media__1780573952321.jpg';
const destPath = path.join(__dirname, '../public/logo.png');

console.log('Copying logo...');
if (fs.existsSync(srcPath)) {
  try {
    fs.copyFileSync(srcPath, destPath);
    console.log('Logo copied successfully!');
  } catch (err) {
    console.error('Failed to copy logo:', err.message);
  }
} else {
  console.error('Source logo file does not exist:', srcPath);
}
