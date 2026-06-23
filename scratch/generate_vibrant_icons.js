const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// CRC32 helper
const makeCRCTable = () => {
  let c;
  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    crcTable[n] = c;
  }
  return crcTable;
};

const crcTable = makeCRCTable();

const crc32 = (buf) => {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ -1) >>> 0;
};

// PNG chunk builder
const writeChunk = (type, data) => {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const typeAndData = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(typeAndData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);
  return Buffer.concat([lenBuf, typeAndData, crcBuf]);
};

// Generate 256x256 PNG buffer from 32x32 pixel shader (nearest neighbor scale to 256x256)
const generatePNG256 = (pixelShader) => {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(256, 0); // width 256
  ihdrData.writeUInt32BE(256, 4); // height 256
  ihdrData.write(
    '\x08' + // bit depth
    '\x06' + // color type: RGBA
    '\x00' + // compression
    '\x00' + // filter
    '\x00',  // interlace
    8, 'binary'
  );
  const ihdrChunk = writeChunk('IHDR', ihdrData);
  
  // IDAT chunk data (uncompressed scanlines)
  // Each scanline is 1 byte filter type (0) + 256 * 4 bytes RGBA = 1025 bytes
  const scanlines = Buffer.alloc(256 * 1025);
  for (let y = 0; y < 256; y++) {
    const rowOffset = y * 1025;
    scanlines[rowOffset] = 0; // Filter type 0
    const sourceY = Math.floor(y / 8); // Scale factor 8
    for (let x = 0; x < 256; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const sourceX = Math.floor(x / 8); // Scale factor 8
      const color = pixelShader(sourceX, sourceY);
      scanlines[pixelOffset] = color.r;
      scanlines[pixelOffset + 1] = color.g;
      scanlines[pixelOffset + 2] = color.b;
      scanlines[pixelOffset + 3] = color.a;
    }
  }
  
  const idatChunk = writeChunk('IDAT', zlib.deflateSync(scanlines));
  const iendChunk = writeChunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([PNG_SIGNATURE, ihdrChunk, idatChunk, iendChunk]);
};

// Folder Icon Shader (Amber/Yellow Folder with Slate 900 Border)
const getFolderColor = (x, y) => {
  const inFolderAt = (px, py) => {
    return (px >= 4 && px <= (12 + (py - 4)) && py >= 4 && py <= 7) || (px >= 2 && px <= 29 && py >= 8 && py <= 27);
  };

  const inFolder = inFolderAt(x, y);
  if (!inFolder) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Pocket line
  if (y === 14) {
    return { r: 15, g: 23, b: 42, a: 255 };
  }
  
  // Outline check (8-neighbors for thicker outer border)
  let isOutline = false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!inFolderAt(x + dx, y + dy)) {
        isOutline = true;
        break;
      }
    }
    if (isOutline) break;
  }
  
  if (isOutline) {
    return { r: 15, g: 23, b: 42, a: 255 };
  }
  
  // Paper check
  const inPaperAt = (px, py) => py >= 5 && py <= 11 && px >= 8 && px <= 23;
  if (inPaperAt(x, y)) {
    const isPaperOutline = y === 5 || x === 8 || x === 23;
    if (isPaperOutline) {
      return { r: 15, g: 23, b: 42, a: 255 };
    }
    return { r: 255, g: 255, b: 255, a: 255 };
  }
  
  // Body and tab fill (Vibrant golden amber)
  if (y >= 15) {
    return { r: 217, g: 119, b: 6, a: 255 }; // Amber 600
  }
  return { r: 245, g: 158, b: 11, a: 255 }; // Amber 500
};

// File Icon Shader (Slate 200 Page with Dog-ear, Slate 900 Outline, Blue 900 Text lines)
const getFileColor = (x, y) => {
  const inPageAt = (px, py) => {
    return px >= 4 && px <= 27 && py >= 2 && py <= 29 && !(py < 9 && px > 18 + py);
  };

  const inPage = inPageAt(x, y);
  if (!inPage) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Outline check (8-neighbors for thicker outer border)
  let isOutline = false;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!inPageAt(x + dx, y + dy)) {
        isOutline = true;
        break;
      }
    }
    if (isOutline) break;
  }
  
  if (isOutline) {
    return { r: 15, g: 23, b: 42, a: 255 };
  }
  
  // Folded triangle outlines
  const isFoldOutline = (x === 20 && y >= 2 && y <= 9) || (y === 9 && x >= 20 && x <= 27) || (x - 20 === y - 2 && y >= 2 && y <= 9);
  if (isFoldOutline) {
    return { r: 15, g: 23, b: 42, a: 255 };
  }
  
  // Folded triangle fill
  const inFold = x >= 20 && y >= 2 && y <= 9 && (x - 20) < (y - 2);
  if (inFold) {
    return { r: 148, g: 163, b: 184, a: 255 }; // Slate 400
  }
  
  // Text lines (draw Blue 900 color for high contrast)
  if ((y === 13 && x >= 8 && x <= 23) ||
      (y === 17 && x >= 8 && x <= 20) ||
      (y === 21 && x >= 8 && x <= 23) ||
      (y === 25 && x >= 8 && x <= 16)) {
    return { r: 30, g: 58, b: 138, a: 255 }; // Blue 900
  }
  
  return { r: 226, g: 232, b: 240, a: 255 }; // Slate 200 (light grey-white page)
};

// Write files to root
fs.writeFileSync(path.join(__dirname, '../drag_folder.png'), generatePNG256(getFolderColor));
fs.writeFileSync(path.join(__dirname, '../drag_file.png'), generatePNG256(getFileColor));

// Write files to frontend/public so they are copied to dist/ and served correctly
const publicDir = path.join(__dirname, '../frontend/public');
if (fs.existsSync(publicDir)) {
  fs.writeFileSync(path.join(publicDir, 'drag_folder.png'), generatePNG256(getFolderColor));
  fs.writeFileSync(path.join(publicDir, 'drag_file.png'), generatePNG256(getFileColor));
}

console.log('Successfully generated premium 256x256 drag icons in root and frontend/public!');
