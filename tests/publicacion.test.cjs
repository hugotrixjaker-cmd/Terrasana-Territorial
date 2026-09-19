const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.join(__dirname,'..');

test('install manifest uses project-relative paths and valid PNG icons',()=>{
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.scope,'./');assert.equal(manifest.start_url,'./');assert.equal(manifest.display,'standalone');
  for(const icon of manifest.icons){const bytes=fs.readFileSync(path.join(root,icon.src));assert.equal(bytes.toString('hex',0,8),'89504e470d0a1a0a');const [size]=icon.sizes.split('x').map(Number);assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);}
});
function worker(){
  const events={};const entries=new Map();const scope='https://example.github.io/terrasana/';
  const context=vm.createContext({URL,Set,Response,Promise,fetch:async()=>{throw new Error('offline');},caches:{open:async()=>({match:async request=>entries.get(request.url)?.clone(),put:async(request,response)=>entries.set(request.url,response)})},self:{registration:{scope},location:{origin:'https://example.github.io'},addEventListener:(name,handler)=>{events[name]=handler;}}});
  vm.runInContext(fs.readFileSync(path.join(root,'sw.js'),'utf8'),context);
  return {events,entries,context,scope};
}
test('offline cache includes every required shell file, with GitHub project scope',()=>{
  const w=worker();const urls=vm.runInContext('[...SHELL_URLS]',w.context);
  for(const url of urls){assert.ok(url.startsWith(w.scope));const relative=url.slice(w.scope.length);assert.ok(fs.existsSync(path.join(root,relative||'index.html')),relative);}
});
test('service worker never intercepts external tiles, personal backups, or requests outside its app',()=>{
  const w=worker();let intercepted=false;
  for(const url of ['https://tile.openstreetmap.org/5/9/14.png',w.scope+'terrasana-respaldo-2026.json','https://example.github.io/another-app/'])w.events.fetch({request:{url,method:'GET'},respondWith(){intercepted=true;}});
  assert.equal(intercepted,false);
});
test('offline navigation returns the cached application instead of failing',async()=>{
  const w=worker();w.entries.set(w.scope,new Response('<html>TERRASANA</html>'));
  let reply;w.events.fetch({request:{url:w.scope,method:'GET'},respondWith(promise){reply=promise;}});
  assert.equal(await (await reply).text(),'<html>TERRASANA</html>');
});
