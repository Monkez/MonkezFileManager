const fs = require('fs');
const path = require('path');

// Solid 32x32 folder icon base64 (high contrast yellow folder)
const folderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABt0lEQVRYR8WXvQoCMRCE51wuxUIri/kD2NpaCFsLW9/A1k+w9RNs/QRbP8HGwhbE2sLWQhBFQcWkKNiY/ZfLOcZwdnaWu2oRDnPn3vIdM3O3C3+8C/+f9x7+z/tgXpwCIUKKECFlSMphKUNIfwWgVqyD57Lo3vKht+30j7mMbtuMbyh3qyHuT19G35v38t/rja8vb8fZdvpW/s5/Wf0ZPYj38l/5mLw338f9OROOg+F4JuZMOHxOx4M5HkL8XgabM+G8CQfD8UzE7+H3M26n4WAPm+FgNJM//kx+D7/zuJ3H7TzORMztPO6P+J2GnX1sRm7ncSZ2Hqdz53HgHOSBtwMeXp5+4OXpAAdOBzy8PP3ggdMBHy9PP3jgdMDDy9MPHjgd8PDy9IMHTgc8vDz94IHTAQ8vTz944HTAw8vTDx44HfDw8vSDB04HPLw8/eCB0wEPL08/eOB0wMPL0w8e/h2A2c8DZwMevDz9wMvTz+nPA2cDHv4/AD/jdh4HzoFzkAfeDnh4efqBl6cD/wtAjpWSnhxCsp+z+e/n7wX9M6wY4bV3wAAAAABJRU5ErkJggg==';

// Solid 32x32 file icon base64 (high contrast white document sheet)
const fileBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAABmklEQVRYR8WXsWoCQRCGz7lWgoKNYn4AS1sLwdbC1jdw+wRpn8DWS7D1EWwsbEEsLWwtBFEUVEyKgo1i/3JGZ4zj7uzsihvCcJh7t/P9Mzt3twt/vAv/n/ce/s/7YF6cAiFCihAhJIWQzDWEkPxXAGrFOngui+4tD3rbTv+Yyui2zfiGfLca4v70ZfS9eS//vd74BvJ2vG2nb+Xv/JfVn9GDeC//lY/Je/N93J8z4ZhzbzG2MV33ZXj8Oav+Ebxf3sf72ZwJx8FwPBNzJpqP+J2GnX1sRm7ncSZ2Hqdz53HgHOSBtwMeXp5+4OXpAAdOBzy8PP3ggdMBHy9PP3jgdMDDy9MPHjgd8PDy9IMHTgc8vDz94IHTAQ8vTz944HTAw8vTDx44HfDw8vSDB04HPLw8/eCB0wEPL08/eOB0wMPL0w8e/h3A2c8DZwMevDz9wMvTz+nPA2cDHv4/AD/jdh4HzoFzkAfeDnh4efqBl6cD/wtAjpWSnhxCsp+z+e/n7wX9M6wY4bV3wAAAAABJRU5ErkJggg==';

fs.writeFileSync(path.join(__dirname, '../drag_file.png'), Buffer.from(fileBase64, 'base64'));
fs.writeFileSync(path.join(__dirname, '../drag_folder.png'), Buffer.from(folderBase64, 'base64'));

console.log('Solid drag icons generated.');
