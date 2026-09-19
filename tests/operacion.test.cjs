const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const crypto = require('node:crypto');

function setup() {
  const root = path.join(__dirname, '..');
  const fields = new Map();
  const storage = new Map();
  const element = id => {
    if (!fields.has(id)) fields.set(id, {value:'',textContent:'',dataset:{},style:{},options:[],selectedIndex:0,classList:{add(){},remove(){},toggle(){}},addEventListener(){},checkValidity(){return true;}});
    return fields.get(id);
  };
  const context = vm.createContext({
    console,crypto:crypto.webcrypto,TextEncoder,setTimeout:()=>0,clearTimeout(){},queueMicrotask,
    window:{addEventListener(){}},
    document:{getElementById:element,querySelector:()=>element('dummy'),querySelectorAll:()=>[],addEventListener(){}},
    localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}
  });
  const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
  vm.runInContext(scripts.find(s=>s.includes('const K_USERS')),context);
  vm.runInContext(fs.readFileSync(path.join(root,'operacion.js'),'utf8'),context);
  const run = source => vm.runInContext(source,context);
  return {run,context,storage,element};
}
const KEY = 'terrasana:caracteriza:casos';

test('save merges records from other tabs and updates without duplicates',()=>{
  const s=setup();s.storage.set(KEY,JSON.stringify([{id:'older',nombres:'Conservar'}]));
  assert.equal(s.run("persistirCaso({id:'new',score:12})"),true);
  assert.equal(s.run("persistirCaso({id:'new',score:20})"),true);
  const rows=JSON.parse(s.storage.get(KEY));
  assert.equal(rows.length,2);assert.equal(rows[0].nombres,'Conservar');assert.equal(rows[1].score,20);
});
test('storage quota failure preserves disk and memory and reports failure',()=>{
  const s=setup();s.storage.set(KEY,'[{"id":"older"}]');
  s.run('casos=getCasos()');
  s.context.localStorage.setItem=()=>{throw new Error('QuotaExceededError');};
  assert.equal(s.run("persistirCaso({id:'new'})"),false);
  assert.equal(s.storage.get(KEY),'[{"id":"older"}]');assert.equal(s.run('casos.length'),1);
  assert.match(s.element('ops-notice').textContent,/No se pudo guardar/);
});
test('malformed storage cannot be silently replaced with an empty array',()=>{
  const s=setup();s.storage.set(KEY,'not-json');
  assert.equal(s.run("persistirCaso({id:'new'})"),false);assert.equal(s.storage.get(KEY),'not-json');
  s.storage.set(KEY,'{}');assert.throws(()=>s.run('getCasos()'));
});
test('coordinate validation rejects malformed values and accepts zero latitude',()=>{
  const s=setup();s.element('f-departamento').value='Chocó';s.element('f-municipio').value='Quibdó';
  for(const coordinates of ['91,2','1,181','1,','1,2,3','NaN,2']) {
    s.element('f-coords').value=coordinates;assert.equal(s.run('validarPaso(2)'),false,coordinates);
  }
  s.element('f-coords').value='0, -76.5';assert.equal(s.run('validarPaso(2)'),true);
  assert.equal(s.run("tieneCoordenadas({lat:null,lng:null})"),false);
});
test('save preserves exact coordinates, distinguishes municipal fallback, and prevents repeated submission',()=>{
  const s=setup();
  s.run("validarPaso=()=>true;calcularScore=()=>({score:10,priority:'medium',factores:[]});updateStats=()=>{};setView=()=>{};resetForm=()=>{currentStep=1;};getVal=()=>null;getCheck=()=>false;currentStep=7;");
  s.element('f-municipio').value='Quibdó';s.element('f-municipio').options=[{dataset:{lat:'5.6947',lng:'-76.6611'}}];
  s.element('f-coords').value='0, -76.5';s.element('f-coords').dataset.source='manual';
  s.run('guardarCaso();guardarCaso();');
  let rows=JSON.parse(s.storage.get(KEY));assert.equal(rows.length,1);assert.equal(rows[0].lat,0);assert.equal(rows[0].lng,-76.5);assert.equal(rows[0].locationSource,'manual');
  s.element('f-coords').value='';s.run('currentStep=7;guardarCaso()');
  rows=JSON.parse(s.storage.get(KEY));assert.equal(rows.length,2);assert.equal(rows[1].lat,5.6947);assert.equal(rows[1].lng,-76.6611);assert.equal(rows[1].locationSource,'municipio');
});
test('department scope consistently selects its cases',()=>{
  const s=setup();s.run("casos=[{id:'a',departamento:'Chocó'},{id:'b',departamento:'Risaralda'}];currentDepFilter='Chocó'");
  assert.equal(s.run('casosTerritorio().length'),1);assert.equal(s.run('casosTerritorio()[0].id'),'a');
  s.run("currentDepFilter='all'");assert.equal(s.run('casosTerritorio().length'),2);
});
test('untrusted names and notes are escaped before rendering',()=>{
  const s=setup();assert.equal(s.run(`escapeHTML('<img src=x onerror=alert(1)>')`),'&lt;img src=x onerror=alert(1)&gt;');
});
test('completing a legacy case preserves its original data and adds an explicit municipal location',()=>{
  const s=setup();s.storage.set(KEY,JSON.stringify([{id:'legacy',score:62,obsSalud:'Dato previo',history:[]}]));
  s.run("selectedCaseId='legacy';updateStats=()=>{};renderOperacion=()=>{};abrirCaso=()=>{};");
  for(const [id,value] of Object.entries({'edit-nombres':'Prueba','edit-apellidos':'Ficticia','edit-departamento':'Risaralda','edit-municipio':'Pereira','edit-coords':''}))s.element(id).value=value;
  s.run('guardarUbicacionCaso()');
  const rows=JSON.parse(s.storage.get(KEY));
  assert.equal(rows.length,1);assert.equal(rows[0].id,'legacy');assert.equal(rows[0].obsSalud,'Dato previo');
  assert.equal(rows[0].lat,4.8133);assert.equal(rows[0].lng,-75.6961);assert.equal(rows[0].locationSource,'municipio');assert.equal(rows[0].history.length,1);
});
test('alerts fade according to response state and closed cases remain available in archive',()=>{
  const s=setup();
  assert.equal(s.run("responseState({status:'pending'}).color"),'#ed4b55');
  assert.equal(s.run("responseState({status:'pending'}).progress"),0);
  assert.equal(s.run("responseState({status:'active'}).progress"),40);
  assert.equal(s.run("responseState({status:'followup'}).progress"),75);
  assert.equal(s.run("responseState({status:'closed'}).progress"),100);
  assert.equal(s.run("mapaIncluyeCaso({status:'closed'})"),false);
  assert.equal(s.run("mapaIncluyeCaso({status:'closed'},true)"),true);
  assert.equal(s.run("mapaIncluyeCaso({status:'pending'})"),true);
  assert.equal(s.run("mapaIncluyeCaso({status:'unexpected'})"),true);
});
test('closing and reopening a case preserve the record and append response history',()=>{
  const s=setup();s.storage.set(KEY,JSON.stringify([{id:'response',status:'active',score:62,lat:5.69,lng:-76.66,history:[]}]));
  s.run("selectedCaseId='response';updateStats=()=>{};renderOperacion=()=>{};");
  s.element('case-dialog').close=()=>{};
  s.element('case-state').value='closed';s.element('case-owner').value='Profesional de prueba';s.element('case-note').value='Atención finalizada';
  s.run('guardarGestion()');
  let rows=JSON.parse(s.storage.get(KEY));assert.equal(rows.length,1);assert.equal(rows[0].status,'closed');assert.equal(rows[0].lat,5.69);
  s.element('case-state').value='pending';s.element('case-note').value='Reapertura';s.run('guardarGestion()');
  rows=JSON.parse(s.storage.get(KEY));assert.equal(rows[0].status,'pending');assert.equal(rows[0].history.length,2);
});
