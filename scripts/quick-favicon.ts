const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

async function generateQuickFavicon() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <rect width="32" height="32" fill="#4F46E5" rx="6"/>
    <path d="M8 10h16M8 16h16M8 22h10" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="24" cy="22" r="3" fill="#FFFFFF"/>
  </svg>`;

  await sharp(Buffer.from(svg))
    .resize(32, 32)
    .png()
    .toFile(path.join(process.cwd(), 'public', 'favicon.png'));

  // Convert PNG to ICO
  const pngBuffer = await sharp(path.join(process.cwd(), 'public', 'favicon.png'))
    .resize(32, 32)
    .toBuffer();

  const ico = require('ico-endec');
  const icoBuffer = ico.encode([pngBuffer]);
  fs.writeFileSync(path.join(process.cwd(), 'public', 'favicon.ico'), icoBuffer);

  // Clean up the temporary PNG
  fs.unlinkSync(path.join(process.cwd(), 'public', 'favicon.png'));
}

generateQuickFavicon().catch(console.error); 