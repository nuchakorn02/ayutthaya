const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '../public/logo.png');
const destIconPath = path.join(__dirname, '../src/app/icon.png');
const oldFaviconPath = path.join(__dirname, '../src/app/favicon.ico');

console.log('Replacing favicon...');
if (fs.existsSync(srcPath)) {
  try {
    // Copy to icon.png
    fs.copyFileSync(srcPath, destIconPath);
    console.log('Copied logo.png to src/app/icon.png');
    
    // Delete old favicon.ico if it exists
    if (fs.existsSync(oldFaviconPath)) {
      fs.unlinkSync(oldFaviconPath);
      console.log('Deleted old favicon.ico');
    }
  } catch (err) {
    console.error('Failed to update favicon:', err.message);
  }
} else {
  console.error('Source logo file does not exist:', srcPath);
}
