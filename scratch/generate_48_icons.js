const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Generate clean, crisp 48x48 drag icons for file and folder

function createPNG(width, height, getPixel) {
  // Build RGBA buffer
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y);
      const idx = (y * width + x) * 4;
      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = a;
    }
  }

  // PNG filter type 0 (None) for each row
  const rawData = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y++) {
    rawData[y * (1 + width * 4)] = 0;
    rgba.copy(rawData, y * (1 + width * 4) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const deflated = zlib.deflateSync(rawData);
  const pngSig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const makeCRC = (type, data) => {
    const combined = Buffer.concat([type, data]);
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < combined.length; i++) {
      crc ^= combined[i];
      for (let k = 0; k < 8; k++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  };

  const makeChunk = (typeStr, data) => {
    const type = Buffer.from(typeStr, 'ascii');
    const length = Buffer.alloc(4);
    length.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(makeCRC(type, data), 0);
    return Buffer.concat([length, type, data, crc]);
  };

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  return Buffer.concat([
    pngSig,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', deflated),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const S = 48;

// ---- Folder Icon (48x48) ----
// Clean flat folder shape with yellow body and slightly darker tab
function folderPixel(x, y) {
  const pad = 4;
  const tabW = 16;
  const tabH = 6;
  const bodyTop = pad + tabH;
  const bodyBot = S - pad - 1;
  const bodyL = pad;
  const bodyR = S - pad - 1;

  // Folder tab
  if (y >= pad && y < bodyTop && x >= bodyL && x < bodyL + tabW) {
    // Tab border
    if (y === pad || x === bodyL || x === bodyL + tabW - 1) {
      return [180, 140, 20, 255]; // dark gold border
    }
    return [255, 200, 50, 255]; // bright tab fill
  }

  // Folder body
  if (y >= bodyTop && y <= bodyBot && x >= bodyL && x <= bodyR) {
    // Border
    if (y === bodyTop || y === bodyBot || x === bodyL || x === bodyR) {
      return [180, 140, 20, 255]; // dark gold border
    }
    // Body gradient effect (subtle)
    const t = (y - bodyTop) / (bodyBot - bodyTop);
    const r = Math.round(255 - t * 20);
    const g = Math.round(200 - t * 15);
    const b = Math.round(50 + t * 10);
    return [r, g, b, 255];
  }

  return [0, 0, 0, 0]; // transparent
}

// ---- File Icon (48x48) ----
// Clean white document with folded corner and gray text lines
function filePixel(x, y) {
  const pad = 6;
  const docL = pad + 4;
  const docR = S - pad - 4;
  const docT = pad;
  const docB = S - pad;
  const foldSize = 10;

  const foldStartX = docR - foldSize;
  const foldEndY = docT + foldSize;

  // Check if pixel is in the folded corner area (triangle to cut out)
  const inFoldCutout = (x > foldStartX && y < foldEndY && (x - foldStartX) + (foldEndY - y) > foldSize);

  if (inFoldCutout) {
    // Draw the fold triangle
    // The fold forms a small triangle with a diagonal line
    const dx = x - foldStartX;
    const dy = foldEndY - y;
    // On the fold diagonal line
    if (Math.abs(dx + dy - foldSize) <= 1) {
      return [160, 170, 180, 255]; // fold crease line
    }
    // Inside the fold (slightly darker, folded paper)
    if (dx + dy < foldSize && x > foldStartX && y < foldEndY) {
      return [210, 215, 220, 255]; // folded part
    }
    return [0, 0, 0, 0];
  }

  // Document body
  if (x >= docL && x <= docR && y >= docT && y <= docB) {
    // Border
    if (x === docL || x === docR || y === docT || y === docB) {
      return [160, 170, 180, 255]; // gray border
    }
    // Text lines
    const lineY = [16, 20, 24, 28, 32, 36];
    const lineLeft = docL + 5;
    const lineLengths = [22, 18, 24, 16, 20, 12];
    for (let i = 0; i < lineY.length; i++) {
      if (y === lineY[i] && x >= lineLeft && x < lineLeft + lineLengths[i]) {
        return [180, 190, 200, 255]; // text line color
      }
    }
    // White document fill
    return [250, 252, 255, 255];
  }

  return [0, 0, 0, 0]; // transparent
}

// Generate and save
const folderPng = createPNG(S, S, folderPixel);
const filePng = createPNG(S, S, filePixel);

const outputs = [
  path.join(__dirname, '..', 'drag_folder.png'),
  path.join(__dirname, '..', 'drag_file.png'),
  path.join(__dirname, '..', 'frontend', 'public', 'drag_folder.png'),
  path.join(__dirname, '..', 'frontend', 'public', 'drag_file.png'),
];

fs.writeFileSync(outputs[0], folderPng);
fs.writeFileSync(outputs[1], filePng);
fs.writeFileSync(outputs[2], folderPng);
fs.writeFileSync(outputs[3], filePng);

console.log(`Generated ${S}x${S} drag icons:`);
outputs.forEach(o => console.log(`  ${o} (${fs.statSync(o).size} bytes)`));
