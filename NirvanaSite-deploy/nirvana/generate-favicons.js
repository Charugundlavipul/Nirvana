/**
 * Generate properly-sized favicon files from the 640x640 source logo.
 * 
 * Creates:
 *   - favicon.ico  → proper ICO with 16x16, 32x32, 48x48 embedded
 *   - favicon.png  → 32x32 PNG (standard favicon)
 *   - favicon-16x16.png → 16x16
 *   - favicon-32x32.png → 32x32
 *   - logo192.png  → 192x192 (apple-touch-icon)
 *   - logo512.png  → 512x512 (manifest + OG)
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const SOURCE = path.join(PUBLIC_DIR, 'favicon.png'); // current 640x640 logo

// ICO file format builder (multi-resolution)
function buildIco(buffers, sizes) {
  // ICO header: 6 bytes
  const numImages = buffers.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = dirEntrySize * numImages;
  
  let offset = headerSize + dirSize;
  const entries = [];
  
  for (let i = 0; i < numImages; i++) {
    const size = sizes[i];
    const buf = buffers[i];
    entries.push({
      width: size === 256 ? 0 : size,
      height: size === 256 ? 0 : size,
      size: buf.length,
      offset: offset,
    });
    offset += buf.length;
  }
  
  // Write header
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);      // reserved
  header.writeUInt16LE(1, 2);      // type: 1 = ICO
  header.writeUInt16LE(numImages, 4);
  
  // Write directory entries
  const dirBuf = Buffer.alloc(dirSize);
  for (let i = 0; i < numImages; i++) {
    const e = entries[i];
    const off = i * dirEntrySize;
    dirBuf.writeUInt8(e.width, off + 0);
    dirBuf.writeUInt8(e.height, off + 1);
    dirBuf.writeUInt8(0, off + 2);        // color palette
    dirBuf.writeUInt8(0, off + 3);        // reserved
    dirBuf.writeUInt16LE(1, off + 4);     // color planes
    dirBuf.writeUInt16LE(32, off + 6);    // bits per pixel
    dirBuf.writeUInt32LE(e.size, off + 8);
    dirBuf.writeUInt32LE(e.offset, off + 12);
  }
  
  return Buffer.concat([header, dirBuf, ...buffers]);
}

async function main() {
  console.log('Source:', SOURCE);
  
  // Backup the originals
  const backupDir = path.join(PUBLIC_DIR, '_favicon_backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  for (const f of ['favicon.ico', 'favicon.png', 'logo192.png', 'logo512.png']) {
    const src = path.join(PUBLIC_DIR, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(backupDir, f));
    }
  }
  console.log('Backed up originals to', backupDir);
  
  // Use the backup as source (sharp can't read and write same file)
  const sourceFile = path.join(backupDir, 'favicon.png');
  const source = sharp(sourceFile);
  const meta = await source.metadata();
  console.log(`Source image: ${meta.width}x${meta.height} ${meta.format}`);
  
  // Generate ICO sizes as PNG buffers
  const icoSizes = [16, 32, 48];
  const icoBuffers = [];
  for (const size of icoSizes) {
    const buf = await sharp(sourceFile)
      .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer();
    icoBuffers.push(buf);
    console.log(`  Generated ${size}x${size} PNG (${buf.length} bytes)`);
  }
  
  // Build ICO file
  const icoBuffer = buildIco(icoBuffers, icoSizes);
  fs.writeFileSync(path.join(PUBLIC_DIR, 'favicon.ico'), icoBuffer);
  console.log(`✓ favicon.ico (${icoBuffer.length} bytes)`);
  
  // Generate favicon.png (32x32)
  await sharp(sourceFile)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon.png'));
  console.log('✓ favicon.png (32x32)');
  
  // Generate favicon-16x16.png
  await sharp(sourceFile)
    .resize(16, 16, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-16x16.png'));
  console.log('✓ favicon-16x16.png');
  
  // Generate favicon-32x32.png
  await sharp(sourceFile)
    .resize(32, 32, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'favicon-32x32.png'));
  console.log('✓ favicon-32x32.png');
  
  // Generate logo192.png (192x192)
  await sharp(sourceFile)
    .resize(192, 192, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo192.png'));
  console.log('✓ logo192.png (192x192)');
  
  // Generate logo512.png (512x512)
  await sharp(sourceFile)
    .resize(512, 512, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toFile(path.join(PUBLIC_DIR, 'logo512.png'));
  console.log('✓ logo512.png (512x512)');
  
  console.log('\nDone! All favicon files generated successfully.');
}

main().catch(console.error);
