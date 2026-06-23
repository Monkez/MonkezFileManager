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

// Generate 64x64 PNG buffer from 32x32 pixel shader (nearest neighbor scale to 64x64)
const generatePNG64 = (pixelShader) => {
  const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(64, 0); // width 64
  ihdrData.writeUInt32BE(64, 4); // height 64
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
  // Each scanline is 1 byte filter type (0) + 64 * 4 bytes RGBA = 257 bytes
  const scanlines = Buffer.alloc(64 * 257);
  for (let y = 0; y < 64; y++) {
    const rowOffset = y * 257;
    scanlines[rowOffset] = 0; // Filter type 0
    const sourceY = Math.floor(y / 2);
    for (let x = 0; x < 64; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const sourceX = Math.floor(x / 2);
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
  const inFolder = (x >= 4 && x <= (12 + (y - 4)) && y >= 4 && y <= 7) || (x >= 2 && x <= 29 && y >= 8 && y <= 27);
  if (!inFolder) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Pocket line
  if (y === 14) {
    return { r: 15, g: 23, b: 42, a: 255 };
  }
  
  // Outline check
  const inFolderLeft = (x - 1 >= 4 && x - 1 <= (12 + (y - 4)) && y >= 4 && y <= 7) || (x - 1 >= 2 && x - 1 <= 29 && y >= 8 && y <= 27);
  const inFolderRight = (x + 1 >= 4 && x + 1 <= (12 + (y - 4)) && y >= 4 && y <= 7) || (x + 1 >= 2 && x + 1 <= 29 && y >= 8 && y <= 27);
  const inFolderUp = (x >= 4 && x <= (12 + (y - 1 - 4)) && y - 1 >= 4 && y - 1 <= 7) || (x >= 2 && x <= 29 && y - 1 >= 8 && y - 1 <= 27);
  const inFolderDown = (x >= 4 && x <= (12 + (y + 1 - 4)) && y + 1 >= 4 && y + 1 <= 7) || (x >= 2 && x <= 29 && y + 1 >= 8 && y + 1 <= 27);
  
  if (!inFolderLeft || !inFolderRight || !inFolderUp || !inFolderDown) {
    return { r: 15, g: 23, b: 42, a: 255 };
  }
  
  // Paper check
  const inPaper = y >= 5 && y <= 11 && x >= 8 && x <= 23;
  if (inPaper) {
    const isPaperOutline = y === 5 || x === 8 || x === 23;
    if (isPaperOutline) {
      return { r: 15, g: 23, b: 42, a: 255 };
    }
    return { r: 255, g: 255, b: 255, a: 255 };
  }
  
  // Body and tab fill
  if (y >= 15) {
    return { r: 245, g: 158, b: 11, a: 255 }; // Amber 500 (darker yellow pocket)
  }
  return { r: 251, g: 191, b: 36, a: 255 }; // Amber 400 (lighter yellow tab/upper body)
};

// File Icon Shader (Crisp White Page with Dog-ear, Slate 900 Outline, Sky 600 Text lines)
const getFileColor = (x, y) => {
  const inPage = x >= 4 && x <= 27 && y >= 2 && y <= 29 && !(y < 9 && x > 18 + y);
  if (!inPage) {
    return { r: 0, g: 0, b: 0, a: 0 };
  }
  
  // Outer outline check
  const inPageLeft = (x - 1 >= 4 && x - 1 <= 27 && y >= 2 && y <= 29 && !(y < 9 && (x - 1) > 18 + y));
  const inPageRight = (x + 1 >= 4 && x + 1 <= 27 && y >= 2 && y <= 29 && !(y < 9 && (x + 1) > 18 + y));
  const inPageUp = (x >= 4 && x <= 27 && y - 1 >= 2 && y - 1 <= 29 && !(y - 1 < 9 && x > 18 + (y - 1)));
  const inPageDown = (x >= 4 && x <= 27 && y + 1 >= 2 && y + 1 <= 29 && !(y + 1 < 9 && x > 18 + (y + 1)));
  
  if (!inPageLeft || !inPageRight || !inPageUp || !inPageDown) {
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
    return { r: 203, g: 213, b: 225, a: 255 }; // Slate 300
  }
  
  // Text lines (draw Sky 600 color)
  if ((y === 13 && x >= 8 && x <= 23) ||
      (y === 17 && x >= 8 && x <= 20) ||
      (y === 21 && x >= 8 && x <= 23) ||
      (y === 25 && x >= 8 && x <= 16)) {
    return { r: 2, g: 132, b: 199, a: 255 };
  }
  
  return { r: 255, g: 255, b: 255, a: 255 };
};

// Write files to root
fs.writeFileSync(path.join(__dirname, '../drag_folder.png'), generatePNG64(getFolderColor));
fs.writeFileSync(path.join(__dirname, '../drag_file.png'), generatePNG64(getFileColor));

// Write files to frontend/public so they are copied to dist/ and served correctly
const publicDir = path.join(__dirname, '../frontend/public');
if (fs.existsSync(publicDir)) {
  fs.writeFileSync(path.join(publicDir, 'drag_folder.png'), generatePNG64(getFolderColor));
  fs.writeFileSync(path.join(publicDir, 'drag_file.png'), generatePNG64(getFileColor));
}

console.log('Successfully generated premium 64x64 drag icons in root and frontend/public!');
