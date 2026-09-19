'use strict';

function createTerrasanaReport(records, options) {
  const {jsPDF, autoTable, scope = 'Chocó y Risaralda', generatedAt = new Date()} = options;
  const doc = new jsPDF({unit:'mm',format:'a4',compress:true});
  const priorities={critical:'Crítico',high:'Alto',medium:'Seguimiento',tbd:'Sin clasificar'};
  const states={pending:'Por atender',active:'En atención',followup:'Seguimiento',closed:'Cerrado'};
  const clean=value=>String(value??'No registrado').replace(/[\u{1F000}-\u{1FFFF}\u2600-\u27FF\uFE0F\u200D]/gu,'').replace(/[\u2010-\u2015]/g,'-').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,'').trim()||'No registrado';
  const name=c=>[c.nombres,c.apellidos].filter(Boolean).join(' ')||'Sin nombre registrado';
  const located=c=>typeof c.lat==='number'&&typeof c.lng==='number'&&Number.isFinite(c.lat)&&Number.isFinite(c.lng)&&Math.abs(c.lat)<=90&&Math.abs(c.lng)<=180;
  const date=value=>{const d=new Date(value);return Number.isNaN(d.getTime())?'No registrada':d.toLocaleString('es-CO',{timeZone:'America/Bogota',dateStyle:'short',timeStyle:'short'});};
  const count=fn=>records.filter(fn).length;
  const table=(body,head,startY=40,widths={})=>autoTable(doc,{head,body,startY,margin:{top:30,bottom:23,left:18,right:18},theme:'striped',styles:{font:'helvetica',fontSize:9,cellPadding:2.4,textColor:[47,65,55],lineColor:[225,232,226],overflow:'linebreak'},headStyles:{fillColor:[26,102,78],textColor:255,fontSize:9},alternateRowStyles:{fillColor:[245,248,245]},columnStyles:widths,rowPageBreak:'avoid'});
  doc.setProperties({title:'TERRASANA - Informe territorial',subject:'Caracterización y seguimiento de casos',author:'TERRASANA',creator:'TERRASANA Centro Territorial'});
  doc.setFillColor(26,78,60);doc.rect(0,0,210,48,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(24);doc.text('TERRASANA',18,21);
  doc.setFont('helvetica','normal');doc.setFontSize(12);doc.text('Informe de caracterización y respuesta territorial',18,31);
  doc.setFontSize(9);doc.setTextColor(192,220,203);doc.text(clean(scope),18,41);
  doc.setTextColor(111,126,115);doc.setFontSize(8);doc.text(`Generado: ${date(generatedAt)} (Colombia)`,18,57);
  const metrics=[['CASOS',records.length],['POR ATENDER',count(c=>!states[c.status]||c.status==='pending')],['CON UBICACIÓN',count(located)],['CERRADOS',count(c=>c.status==='closed')]];
  metrics.forEach(([label,value],i)=>{const x=18+i*44;doc.setTextColor(96,117,102);doc.setFontSize(8);doc.text(label,x,70);doc.setTextColor(31,82,55);doc.setFontSize(24);doc.setFont('helvetica','bold');doc.text(String(value),x,82);doc.setFont('helvetica','normal');});
  doc.setDrawColor(216,228,219);doc.line(18,90,192,90);
  function bars(title,rows,y) {
    doc.setTextColor(38,78,53);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(title,18,y);doc.setFont('helvetica','normal');
    rows.forEach(([label,value,color],i)=>{const top=y+11+i*12;doc.setTextColor(83,101,88);doc.setFontSize(9);doc.text(label,18,top);doc.text(String(value),192,top,{align:'right'});doc.setFillColor(232,239,233);doc.rect(74,top-3.5,105,4,'F');if(value&&records.length){doc.setFillColor(...color);doc.rect(74,top-3.5,105*value/records.length,4,'F');}});
  }
  bars('01 / Prioridad de atención',Object.entries(priorities).map(([key,label])=>[label,count(c=>(priorities[c.priority]?c.priority:'tbd')===key),({critical:[198,40,40],high:[182,108,0],medium:[35,130,81],tbd:[102,112,125]})[key]]),104);
  bars('02 / Estado de respuesta',Object.entries(states).map(([key,label])=>[label,count(c=>(states[c.status]?c.status:'pending')===key),({pending:[198,40,40],active:[182,108,0],followup:[35,130,81],closed:[102,112,125]})[key]]),171);
  const missingNames=count(c=>!c.nombres||!c.apellidos),missingLocation=count(c=>!located(c)),missingTerritory=count(c=>!c.departamento||!c.municipio);
  doc.setFontSize(11);doc.setFont('helvetica','bold');doc.setTextColor(39,79,54);doc.text('03 / Calidad de los registros',18,235);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(87,104,91);
  doc.text(doc.splitTextToSize(`${missingNames} ficha(s) con identificación incompleta. ${missingLocation} sin coordenadas. ${missingTerritory} sin departamento o municipio. Los datos faltantes se muestran como no registrados.`,172),18,244);
  doc.setFontSize(8);doc.text(doc.splitTextToSize('Fuente: registros locales del navegador. La clasificación corresponde al motor del prototipo; no constituye diagnóstico clínico. Este documento no acredita notificaciones ni atención prestada fuera del sistema.',172),18,263);
  doc.addPage();
  doc.setTextColor(39,79,54);doc.setFontSize(17);doc.setFont('helvetica','bold');doc.text('Inventario de casos',18,40);doc.setFont('helvetica','normal');
  table(records.length?records.map((c,i)=>[String(i+1),clean(name(c)),clean([c.municipio,c.departamento].filter(Boolean).join(', ')),priorities[c.priority]||priorities.tbd,states[c.status]||states.pending,clean(c.asignadoA||'Sin asignar')]):[['-','Sin registros para este territorio','-','-','-','-']],[['N.º','Persona','Territorio','Prioridad','Estado','Responsable']],48,{0:{cellWidth:10},1:{cellWidth:37},2:{cellWidth:38},3:{cellWidth:27},4:{cellWidth:27},5:{cellWidth:35}});
  for(const [index,c] of records.entries()) {
    doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(39,79,54);doc.text(`Ficha ${index+1} / Caracterización`,18,40);doc.setFont('helvetica','normal');
    const locationLabel=({gps:'GPS del dispositivo',manual:'Ingreso manual',municipio:'Referencia municipal aproximada'})[c.locationSource]||'Ubicación sin verificar';
    const row=(label,value)=>[label,clean(value)];
    const data=[row('ID del caso',c.id),row('Persona',name(c)),row('Fecha de registro',date(c.timestamp)),row('Edad / sexo',[c.edad??'No registrada',c.sexo||'No registrado'].join(' / ')),row('Documento',[c.tipoDoc,c.numDoc].filter(Boolean).join(' ')),row('Teléfono / correo',[c.telefono,c.email].filter(Boolean).join(' / ')),row('Departamento / municipio',[c.departamento,c.municipio].filter(Boolean).join(' / ')),row('Dirección / vereda',[c.direccion,c.vereda].filter(Boolean).join(' / ')),row('Coordenadas',located(c)?`${c.lat.toFixed(6)}, ${c.lng.toFixed(6)} - ${locationLabel}`:'Sin coordenadas'),row('Vivienda / refugio',[c.vivienda,c.refugio].filter(Boolean).join(' / ')),row('Servicios disponibles',Array.isArray(c.servicios)?c.servicios.join(', '):null),row('Salud / lesiones',[...(Array.isArray(c.salud)?c.salud:[]),c.lesiones].filter(Boolean).join(', ')),row('Medicación / afiliación',[c.medicacion,c.eps].filter(Boolean).join(' / ')),row('Observaciones de salud',c.obsSalud),row('Hogar / dependientes',`Personas: ${c.personasHogar??'No registrado'}; menores: ${c.menores??'No registrado'}; mayores: ${c.mayores??'No registrado'}`),row('Ingresos / apoyo',[c.ingresos,c.apoyo].filter(Boolean).join(' / ')),row('Respuestas psicosociales',c.likert?Object.entries(c.likert).map(([key,value])=>`${key}: ${value}`).join(' | '):null),row('Observaciones psicosociales',c.obsPsico),row('Prioridad / puntaje',`${priorities[c.priority]||priorities.tbd} / ${c.score??'No registrado'}`),row('Factores de priorización',Array.isArray(c.factores)?c.factores.map(f=>clean(f.t)).join('\n'):null),row('Estado / responsable',`${states[c.status]||states.pending} / ${c.asignadoA||'Sin asignar'}`)];
    if(Array.isArray(c.history)&&c.history.length)data.push(row('Historial',c.history.map(h=>`${date(h.at)} - ${states[h.status]||h.status} - ${h.owner||'Sin asignar'}\n${h.note||'Actualización de gestión'}`).join('\n\n')));
    table(data,[['Campo','Información registrada']],48,{0:{cellWidth:49},1:{cellWidth:125}});
  }
  const total=doc.getNumberOfPages();
  for(let page=1;page<=total;page++){
    doc.setPage(page);
    if(page>1){doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(26,102,78);doc.text('TERRASANA / INFORME TERRITORIAL',18,17);doc.setDrawColor(218,229,220);doc.line(18,22,192,22);}
    doc.setDrawColor(218,229,220);doc.line(18,279,192,279);doc.setTextColor(110,122,114);doc.setFont('helvetica','normal');doc.setFontSize(7);doc.text('Uso institucional - contiene información personal de los casos registrados.',18,285);doc.text(`${page} / ${total}`,192,285,{align:'right'});
  }
  return doc;
}

let reportPdfUrl=null;
let previewDocument=null;
let previewGeneration=0;
function informeActual() {
  if(!window.jspdf?.jsPDF)throw new Error('El generador PDF no está disponible.');
  const records=getCasos().filter(c=>currentDepFilter==='all'||c.departamento===currentDepFilter);
  return createTerrasanaReport(records,{jsPDF:window.jspdf.jsPDF,autoTable:(doc,options)=>doc.autoTable(options),scope:currentDepFilter==='all'?'Chocó y Risaralda':currentDepFilter});
}
function descargarInforme() {
  try {informeActual().save(`TERRASANA_Informe_${new Date().toISOString().slice(0,10)}.pdf`);notify('Informe PDF generado con los registros del territorio seleccionado.');}
  catch(error){notify('No se pudo generar el informe. Verifica que los archivos del software estén completos y que los datos se puedan leer.',true);console.error(error);}
}
async function previsualizarInforme() {
  const generation=++previewGeneration;
  const container=document.getElementById('pdf-preview');
  try {
    if(reportPdfUrl)URL.revokeObjectURL(reportPdfUrl);
    if(previewDocument)await previewDocument.destroy();
    const report=informeActual();
    reportPdfUrl=report.output('bloburl');
    document.getElementById('pdf-download').href=reportPdfUrl;
    container.innerHTML='<p class="empty-state" role="status">Preparando páginas del informe…</p>';
    document.getElementById('pdf-dialog').showModal();refreshIcons();
    const pdfjs=await import('./vendor/pdf.min.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdf.worker.min.mjs',document.baseURI).href;
    const pdf=await pdfjs.getDocument({data:new Uint8Array(report.output('arraybuffer')),useSystemFonts:true}).promise;
    if(generation!==previewGeneration){await pdf.destroy();return;}
    previewDocument=pdf;container.replaceChildren();
    for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++) {
      if(generation!==previewGeneration)return;
      const page=await pdf.getPage(pageNumber);
      const viewport=page.getViewport({scale:1.4});
      const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;canvas.setAttribute('aria-label',`Página ${pageNumber} de ${pdf.numPages}`);canvas.setAttribute('role','img');container.append(canvas);
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
    }
  } catch(error){if(generation===previewGeneration)container.innerHTML='<p class="empty-state">No se pudo mostrar la vista previa. Puedes descargar el PDF con el botón superior.</p>';console.error(error);}
}
function cerrarInforme(){previewGeneration++;document.getElementById('pdf-dialog').close();document.getElementById('pdf-preview').replaceChildren();if(reportPdfUrl)URL.revokeObjectURL(reportPdfUrl);reportPdfUrl=null;if(previewDocument)previewDocument.destroy();previewDocument=null;}
if(typeof module!=='undefined'&&module.exports)module.exports={createTerrasanaReport};
if(typeof document!=='undefined')document.getElementById('pdf-dialog').addEventListener('cancel',event=>{event.preventDefault();cerrarInforme();});
