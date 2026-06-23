const fs = require('fs');
const path = require('path');

// Minimal 32x32 clean file icon (crisp white sheet with border)
const fileBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAlUlEQVRYR+2WwQoAIQhE7///6O5iF2uL0qKHvQve1pHpENG12lpKqdr9WsV6Wav8U15mXoa/dM2XmbuZkue9MiX3MCXux0qZ+8GUuB9MifvBlLgfTMt9M3cyZUr7yvvkN/v6MjM3U/K8V6bkHqbE/Vgpcz+YEveDKXE/mJb7Zh7pd+U6M0a/f28A74/e7bndB672K/v5PqG0AAAAAElFTkSuQmCC';

// Minimal 32x32 clean folder icon (crisp folder silhouette)
const folderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAAfElEQVRYR+2WwQoAIQhE7///6O5iFx2K0qKHvQtep5HpENG1qlpKaepulcpVqVz8p/JMPIXfcrX3zNjJlDTPmSm5hylxPlbKzA+mxPlgSpwPpsT5YFpuZe5kypTmKevIX7aVZcZEpqR5zkzJPUyJ87FSZn4wJc4HU+J8MC33iTs69i37o8iYwQAAAABJRU5ErkJggg==';

fs.writeFileSync(path.join(__dirname, '../drag_file.png'), Buffer.from(fileBase64, 'base64'));
fs.writeFileSync(path.join(__dirname, '../drag_folder.png'), Buffer.from(folderBase64, 'base64'));

console.log('Clean drag icons generated.');
