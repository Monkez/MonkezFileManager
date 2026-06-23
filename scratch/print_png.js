const fs = require('fs');
const path = require('path');

const imgPath = path.join(__dirname, '../drag_folder.png');
const buf = fs.readFileSync(imgPath);

console.log('PNG size:', buf.length, 'bytes');
console.log('PNG Header:', buf.toString('hex', 0, 8));
// We can use a simple check
