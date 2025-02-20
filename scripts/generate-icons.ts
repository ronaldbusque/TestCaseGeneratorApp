import * as fs from 'fs';
import * as path from 'path';
import Jimp from 'jimp';

async function createIcon() {
  // Create a 512x512 base image (we'll resize it later)
  return new Promise<any>((resolve, reject) => {
    new (Jimp as any)(512, 512, '#4F46E5', (err: Error, image: any) => {
      if (err) reject(err);

      // Draw three white horizontal lines
      const white = 0xFFFFFFFF;
      for (let y of [150, 256, 362]) {  // Evenly spaced lines
        for (let x = 128; x < 384; x++) {  // Center lines horizontally
          for (let t = -4; t <= 4; t++) {  // Make lines 9px thick
            image.setPixelColor(white, x, y + t);
          }
        }
      }

      resolve(image);
    });
  });
}

async function generateIcons() {
  try {
    const baseImage = await createIcon();
    const publicDir = path.join(process.cwd(), 'public');

    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir);
    }

    // Generate all sizes
    const sizes = {
      'icon-192.png': 192,
      'icon-512.png': 512,
      'apple-touch-icon.png': 180,
      'favicon.ico': 32
    };

    for (const [filename, size] of Object.entries(sizes)) {
      const resized = baseImage.clone().resize(size, size);
      await resized.writeAsync(path.join(publicDir, filename));
      console.log(`Generated ${filename}`);
    }

  } catch (error) {
    console.error('Error generating icons:', error);
    throw error;
  }
}

async function generateManifest() {
  const manifest = {
    name: 'AI Test Case Generator',
    short_name: 'Test Gen',
    description: 'Generate comprehensive test cases using AI models',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#4F46E5',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png'
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png'
      }
    ]
  };

  await fs.promises.writeFile(
    path.join(process.cwd(), 'public', 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );
  console.log('Generated manifest.json');
}

async function generateAllAssets() {
  await generateIcons();
  await generateManifest();
}

generateAllAssets().catch(console.error); 