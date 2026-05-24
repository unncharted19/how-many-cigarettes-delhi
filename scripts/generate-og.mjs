import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(__dirname, '../public/og-image.svg'));

await sharp(svg)
  .resize(1200, 630)
  .png()
  .toFile(join(__dirname, '../public/og-image.png'));

console.log('✓ public/og-image.png generated (1200×630)');
