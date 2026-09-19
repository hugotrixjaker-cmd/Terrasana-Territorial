const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname,'..');
const output = path.join(root,'_site');
// An explicit allowlist keeps backups, tests and personal records out of Pages.
const files = ['index.html','operacion.js','operacion.css','centro-operaciones.css','informe.js','pwa.js','sw.js','manifest.webmanifest','brigada-bg.jpg','.nojekyll'];
fs.mkdirSync(output,{recursive:true});
for (const file of files)fs.copyFileSync(path.join(root,file),path.join(output,file));
for (const folder of ['vendor','assets'])fs.cpSync(path.join(root,folder),path.join(output,folder),{recursive:true});
console.log('Sitio estatico listo en _site');
