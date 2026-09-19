const test=require('node:test');
const assert=require('node:assert/strict');
const {jsPDF}=require('../vendor/jspdf.umd.min.js');
const {autoTable}=require('../vendor/jspdf.plugin.autotable.min.js');
const {createTerrasanaReport}=require('../informe.js');
test('PDF supports an empty territory with a complete report',()=>{
  const doc=createTerrasanaReport([],{jsPDF,autoTable});
  assert.equal(doc.getNumberOfPages(),2);assert.ok(doc.output().startsWith('%PDF-'));
});
test('PDF supports incomplete legacy cases and long clinical notes without mutating data',()=>{
  const records=[{id:'TEST-ONLY',priority:'critical',status:'pending',lat:null,lng:null,obsSalud:'Nota ficticia de prueba. '.repeat(170),factores:[{t:'Factor registrado'}]}];
  const before=JSON.stringify(records);
  const doc=createTerrasanaReport(records,{jsPDF,autoTable,generatedAt:new Date('2026-09-19T12:00:00Z')});
  assert.ok(doc.getNumberOfPages()>=3);assert.equal(JSON.stringify(records),before);assert.ok(doc.output('arraybuffer').byteLength>1500);
});
