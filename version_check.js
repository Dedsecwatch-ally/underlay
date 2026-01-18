const { app } = require('electron');
console.log('--- VERSION INFO ---');
console.log('Electron:', process.versions.electron);
console.log('Chromium:', process.versions.chrome);
console.log('Node:', process.versions.node);
console.log('Arch:', process.arch);
console.log('--------------------');
app.quit();
