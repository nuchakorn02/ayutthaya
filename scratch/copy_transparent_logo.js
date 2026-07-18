const fs = require('fs');
const path = require('path');

const srcPath = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514\\transparent_emblem_logo_1780575347184.png';
const destLogoPath = path.join(__dirname, '../public/logo.png');
const destIconPath = path.join(__dirname, '../src/app/icon.png');

console.log('Copying transparent logo...');
if (fs.existsSync(srcPath)) {
  try {
    fs.copyFileSync(srcPath, destLogoPath);
    console.log('Updated logo.png with transparent version!');
    
    fs.copyFileSync(srcPath, destIconPath);
    console.log('Updated app/icon.png with transparent version!');
  } catch (err) {
    console.error('Failed to copy transparent logo:', err.message);
  }
} else {
  console.error('Source transparent file does not exist:', srcPath);
}
