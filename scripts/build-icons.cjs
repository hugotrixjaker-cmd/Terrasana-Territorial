const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const { Activity } = require('../vendor/lucide.min.js');

async function main() {
  const directory = path.join(__dirname,'..','assets');
  fs.mkdirSync(directory,{recursive:true});
  const paths=Activity[2].map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).map(([key,value])=>`${key}="${value}"`).join(' ')}/>`).join('');
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#126e61"/><svg x="126" y="126" width="260" height="260" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths}</svg></svg>`;
  for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['icon-maskable.png',512]])await sharp(Buffer.from(svg)).resize(size,size).png().toFile(path.join(directory,name));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
