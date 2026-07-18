const fs = require('fs');
const path = require('path');

const srcDir = 'C:\\Users\\User\\.gemini\\antigravity\\brain\\0cfd52dc-e84d-4be8-9e07-8cf1b52e5514';
const destDir = path.join(__dirname, '../public');

const files = [
  { src: 'media__1780572422389.jpg', dest: 'banner1.png' },
  { src: 'media__1780572422401.jpg', dest: 'banner2.png' },
  { src: 'media__1780572422418.jpg', dest: 'banner3.png' },
  { src: 'media__1780572422453.png', dest: 'banner4.png' },
  { src: 'media__1780572458728.jpg', dest: 'banner5.png' }
];

console.log('Starting image copy...');
files.forEach(f => {
  const srcPath = path.join(srcDir, f.src);
  const destPath = path.join(destDir, f.dest);
  
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${f.src} -> ${f.dest}`);
    } catch (err) {
      console.error(`Failed to copy ${f.src}:`, err.message);
    }
  } else {
    console.error(`Source file does not exist: ${srcPath}`);
  }
});
console.log('Finished image copy.');
