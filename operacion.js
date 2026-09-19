'use strict';

let storageHealthy = true;
let territoryMap = null;
let mapMarkers = [];
const markerRegistry = new Map();
let selectedMapCaseId = null;
let mapWaitTimer = null;
let mapAttempts = 0;
let selectedCaseId = null;
let noticeTimer = null;
const PRIORITIES = {
  critical: {label: 'Crítico', color: '#c62828'},
  high: {label: 'Alto', color: '#b66c00'},
  medium: {label: 'Seguimiento', color: '#238251'},
  tbd: {label: 'Sin clasificar', color: '#667085'}
};
const CASE_STATES = {pending: 'Por atender', active: 'En atención', followup: 'Seguimiento', closed: 'Cerrados'};
const RESPONSE_STATES = {
  pending: {label:'Recibido',progress:0,color:'#ed4b55',opacity:1},
  active: {label:'En atención',progress:40,color:'#d39422',opacity:0.88},
  followup: {label:'Seguimiento',progress:75,color:'#128783',opacity:0.64},
  closed: {label:'Cerrado',progress:100,color:'#71817c',opacity:0.45}
};
function refreshIcons() { if(window.lucide)window.lucide.createIcons({attrs:{'stroke-width':1.7,'aria-hidden':'true'}}); }
function responseState(c) { return RESPONSE_STATES[estado(c)]; }
function mapaIncluyeCaso(c, showClosed = false) { return showClosed || estado(c) !== 'closed'; }
function reducedMotion() { return !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('motion-paused'); }
function toggleMotion() {
  const paused=document.documentElement.classList.toggle('motion-paused');
  const button=document.getElementById('motion-toggle');
  button.setAttribute('aria-pressed',String(paused));
  button.setAttribute('aria-label',paused?'Activar animaciones':'Pausar animaciones');
  button.title=paused?'Activar animaciones':'Pausar animaciones';
  button.innerHTML=`<i data-lucide="${paused?'play':'pause'}"></i>`;refreshIcons();
}
function toggleMapFocus() {
  const focused=document.getElementById('app').classList.toggle('map-focused');
  const button=document.getElementById('focus-toggle');
  button.setAttribute('aria-pressed',String(focused));
  button.title=focused?'Restaurar vista':'Ampliar mapa';
  button.setAttribute('aria-label',button.title);
  requestAnimationFrame(()=>territoryMap?.resize());
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
}
function prioridad(c) { return PRIORITIES[c.priority] || PRIORITIES.tbd; }
function estado(c) { return Object.hasOwn(CASE_STATES, c.status) ? c.status : 'pending'; }
function casosTerritorio() { return casos.filter(c => currentDepFilter === 'all' || c.departamento === currentDepFilter); }
function nombreCaso(c) { return [c.nombres, c.apellidos].filter(Boolean).join(' ') || 'Sin nombre'; }
function rutaSugerida(p) {
  return ({critical: 'Entidades territoriales · revisión urgente', high: 'Coordinación UNAD · equipo psicosocial', medium: 'Acompañamiento comunitario · supervisión profesional'})[p] || 'Coordinación territorial · revisar caracterización';
}
function fecha(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Sin fecha' : date.toLocaleString('es-CO', {dateStyle: 'short', timeStyle: 'short'});
}
function notify(message, error = false) {
  const dialog = document.getElementById('case-dialog');
  let box = document.getElementById('ops-notice');
  if (dialog.open) {
    let inDialog = document.getElementById('dialog-notice');
    if (!inDialog) {inDialog=document.createElement('p');inDialog.id='dialog-notice';inDialog.setAttribute('role','status');dialog.prepend(inDialog);}
    box=inDialog;
  }
  clearTimeout(noticeTimer);
  box.textContent = message;
  box.className = error ? 'error' : '';
  box.hidden = false;
  if (!error) noticeTimer = setTimeout(() => { box.hidden = true; }, 10000);
}

// Read before each write so cases created in another tab are retained.
function persistirCaso(caso) {
  if (!storageHealthy) { notify('No se puede guardar hasta resolver el error de lectura del almacenamiento.', true); return false; }
  try {
    const latest = getCasos();
    const index = latest.findIndex(c => c.id === caso.id);
    if (index < 0) latest.push(caso); else latest[index] = caso;
    saveCasos(latest);
    casos = latest;
    return true;
  } catch (error) {
    notify('No se pudo guardar. El navegador bloquea el almacenamiento, está lleno o los datos no se pueden leer. El formulario sigue disponible; no cierres esta página.', true);
    return false;
  }
}

function validarPaso(step) {
  const value = id => document.getElementById(id).value.trim();
  let message = '';
  if (step === 1) {
    if (!value('f-nombres') || !value('f-apellidos') || !value('f-num-doc')) message = 'Completa nombres, apellidos y número de documento.';
    else if (!Number.isInteger(Number(value('f-edad'))) || Number(value('f-edad')) < 19 || Number(value('f-edad')) > 59) message = 'La edad debe estar entre 19 y 59 años para este formulario.';
    else if (value('f-email') && !document.getElementById('f-email').checkValidity()) message = 'Revisa el correo de contacto.';
  }
  if (step === 2) {
    if (!value('f-departamento') || !value('f-municipio')) message = 'Selecciona el departamento y el municipio.';
    const coords = value('f-coords');
    if (coords) {
      const parts = coords.split(',');
      const [lat, lng] = parts.map(x => Number(x.trim()));
      if (parts.length !== 2 || parts.some(x => !x.trim()) || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) message = 'Usa coordenadas válidas en formato latitud, longitud. Ejemplo: 5.6947, -76.6611.';
    }
  }
  if (step === 3 && (!getVal('f-vivienda') || !getVal('f-refugio'))) message = 'Selecciona el estado de la vivienda y la necesidad de refugio.';
  if (step === 4 && (!getVal('f-lesiones') || !getVal('f-medicacion') || !getVal('f-eps'))) message = 'Completa lesiones, acceso a medicación y afiliación a salud.';
  if (step === 5) {
    if (!getVal('f-ingresos') || !getVal('f-apoyo')) message = 'Selecciona los ingresos y la red de apoyo.';
    const counts = ['f-personas-hogar', 'f-menores', 'f-mayores'].map(id => Number(value(id)));
    if (counts.some(n => !Number.isInteger(n) || n < 0) || counts[0] < 1) message = 'Revisa el número de personas del hogar y de dependientes.';
  }
  if (step === 6 && ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'].some(q => !likertResp[q])) message = 'Responde las seis preguntas psicosociales antes de calcular el resultado.';
  if (message) { notify(message, true); return false; }
  document.getElementById('ops-notice').hidden = true;
  return true;
}

function renderOperacion() {
  if (!currentUser) return;
  document.getElementById('mobile-territory').value=currentDepFilter;
  if (currentView === 'map') renderMapa();
  if (currentView === 'bandeja') renderBandeja();
  if (currentView === 'reports') renderReportes();
}

function renderBandeja() {
  const query = document.getElementById('case-search').value.trim().toLocaleLowerCase('es');
  const visible = casosTerritorio().filter(c => (bandejaFilter === 'all' || c.priority === bandejaFilter) && [nombreCaso(c), c.municipio, c.id].join(' ').toLocaleLowerCase('es').includes(query));
  document.getElementById('case-count').textContent = `${visible.length} caso(s)`;
  const container = document.getElementById('kanban');
  container.replaceChildren();
  for (const [key, label] of Object.entries(CASE_STATES)) {
    const items = visible.filter(c => estado(c) === key).sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
    const column = document.createElement('section');
    column.className = 'kanban-column';
    column.innerHTML = `<h3>${label}<span>${items.length}</span></h3>`;
    if (!items.length) column.insertAdjacentHTML('beforeend', '<p class="empty-state">Sin casos en este estado</p>');
    for (const c of items) {
      const card = document.createElement('article');
      card.className = 'case-card';
      card.style.borderLeftColor = prioridad(c).color;
      card.innerHTML = `<div class="case-top"><span class="priority-tag ${escapeHTML(Object.hasOwn(PRIORITIES,c.priority)?c.priority:'tbd')}">${prioridad(c).label}</span><span>${Number(c.score)||0} pts</span></div><h4>${escapeHTML(nombreCaso(c))}</h4><p>${escapeHTML(c.municipio)} · ${escapeHTML(c.departamento)}</p><p class="case-route">${escapeHTML(c.rutaSugerida || rutaSugerida(c.priority))}</p><p>Responsable: <b>${escapeHTML(c.asignadoA || 'Por asignar')}</b></p><small>${fecha(c.timestamp)}</small>`;
      card.insertAdjacentHTML('beforeend',`<div class="case-progress-track" aria-label="Avance de gestión: ${responseState(c).progress}%"><span style="width:${responseState(c).progress}%;background:${responseState(c).color}"></span></div>`);
      const button = document.createElement('button');
      button.className = 'ops-button';
      button.textContent = 'Abrir caso';
      button.onclick = () => abrirCaso(c.id);
      card.append(button);
      column.append(card);
    }
    container.append(column);
  }
}

function tieneCoordenadas(c) {
  return typeof c.lat === 'number' && typeof c.lng === 'number' && Number.isFinite(c.lat) && Number.isFinite(c.lng) && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180;
}
function origenUbicacion(c) {
  if (!tieneCoordenadas(c)) return 'Sin coordenadas';
  if (c.locationSource === 'municipio') return 'Referencia municipal aproximada';
  if (c.locationSource === 'gps') return `GPS del dispositivo${c.locationAccuracy ? ` · precisión ±${Math.round(c.locationAccuracy)} m` : ''}`;
  if (c.locationSource === 'manual') return 'Coordenadas ingresadas manualmente';
  return 'Registro anterior · ubicación sin verificar';
}

function renderMapa() {
  const territory=casosTerritorio();
  const query=document.getElementById('map-search').value.trim().toLocaleLowerCase('es');
  const showClosed=document.getElementById('show-closed').checked;
  const visible = territory.filter(c=>mapaIncluyeCaso(c,showClosed)&&[nombreCaso(c),c.municipio,c.id].join(' ').toLocaleLowerCase('es').includes(query));
  const located = visible.filter(tieneCoordenadas);
  document.getElementById('map-summary').textContent = `${located.length} localizado(s) · ${visible.length - located.length} sin ubicación`;
  document.getElementById('map-queue-count').textContent=String(visible.length);
  document.getElementById('response-metrics').innerHTML=Object.entries(RESPONSE_STATES).map(([state,meta])=>`<div class="response-metric ${state}"><span class="metric-symbol"><i data-lucide="${{pending:'radio',active:'heart-handshake',followup:'route',closed:'circle-check'}[state]}"></i></span><div><span>${meta.label}</span><strong>${territory.filter(c=>estado(c)===state).length.toString().padStart(2,'0')}</strong></div><span class="metric-status-line"></span></div>`).join('');
  const list = document.getElementById('map-cases');
  list.replaceChildren();
  if (!visible.length) list.innerHTML = '<div class="empty-queue"><i data-lucide="circle-check"></i><h4>Sin alertas en esta vista</h4><p>No hay casos que coincidan con los filtros.</p></div>';
  for (const c of [...visible].sort((a,b)=>responseState(a).progress-responseState(b).progress || (Number(b.score)||0)-(Number(a.score)||0))) {
    const item = document.createElement('button');
    item.className = 'map-case response-item'+(c.id===selectedMapCaseId?' selected':'');
    item.dataset.caseId=c.id;
    item.innerHTML = `<span class="queue-state"><i class="legend-dot ${estado(c)}"></i>${responseState(c).label}<span class="queue-priority">${prioridad(c).label}</span></span><b>${escapeHTML(nombreCaso(c))}</b><span>${escapeHTML(c.municipio||'Municipio pendiente')}</span><small>${escapeHTML(origenUbicacion(c))}</small><div class="case-progress-track"><span style="width:${responseState(c).progress}%;background:${responseState(c).color}"></span></div>`;
    item.onclick = () => seleccionarCasoMapa(c.id);
    list.append(item);
  }
  if(!visible.some(c=>c.id===selectedMapCaseId)){selectedMapCaseId=null;document.getElementById('map-inspector').hidden=true;}
  else renderInspectorMapa();
  refreshIcons();
  if (!window.maplibregl) {
    document.getElementById('map-status').textContent = mapAttempts < 30 ? 'Cargando cartografía…' : 'No se pudo cargar el mapa. Revisa la conexión y vuelve a abrir esta vista. Los casos siguen disponibles en la lista.';
    if (!mapWaitTimer && mapAttempts < 30) mapWaitTimer = setTimeout(() => {mapWaitTimer = null;mapAttempts++;if(currentView === 'map')renderMapa();}, 500);
    return;
  }
  if (!territoryMap) {
    try {
      territoryMap = new maplibregl.Map({
        container: 'territory-map', center: [-76.35, 5.7], zoom: 6,
        style: {version: 8, sources: {osm: {type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}}, layers: [{id: 'osm', type: 'raster', source: 'osm'}]}
      });
      territoryMap.addControl(new maplibregl.NavigationControl({showCompass: false}), 'top-right');
      territoryMap.on('mousemove', e=>{document.getElementById('map-coordinate-readout').textContent=`${e.lngLat.lat.toFixed(4)}° N   ${Math.abs(e.lngLat.lng).toFixed(4)}° O`;});
      territoryMap.on('load', () => {document.getElementById('map-status').hidden = true;});
      territoryMap.on('error', () => {const s=document.getElementById('map-status');s.hidden=false;s.textContent='No se pudo cargar parte de la cartografía. Revisa tu conexión; los registros permanecen guardados.';});
      territoryMap.on('idle', () => {if(territoryMap.areTilesLoaded())document.getElementById('map-status').hidden=true;});
      encuadrarMapa();
    } catch (error) {
      document.getElementById('map-status').textContent = 'El mapa no está disponible en este navegador. Puedes consultar los casos y sus coordenadas en la lista.';
      return;
    }
  }
  requestAnimationFrame(() => territoryMap.resize());
  // One marker per exact coordinate, without falsifying or jittering locations.
  const groups = new Map();
  for (const c of located) {
    const key = `${c.lat},${c.lng}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(c);
  }
  for (const [key,entry] of markerRegistry) {
    if(groups.has(key))continue;
    const resolved=entry.ids.every(id=>casos.some(c=>c.id===id&&estado(c)==='closed'));
    if(resolved&&!reducedMotion()) {entry.element.classList.add('is-resolved');setTimeout(()=>entry.marker.remove(),650);}
    else entry.marker.remove();
    markerRegistry.delete(key);
  }
  for (const [key,group] of groups) {
    const head = [...group].sort((a,b)=>responseState(a).progress-responseState(b).progress||(Number(b.score)||0)-(Number(a.score)||0))[0];
    let entry=markerRegistry.get(key);
    if(!entry){const element=document.createElement('button');element.className='case-marker alert-marker';entry={element,marker:new maplibregl.Marker({element}).setLngLat([head.lng,head.lat]).addTo(territoryMap),ids:[]};markerRegistry.set(key,entry);}
    const marker=entry.element;
    entry.ids=group.map(c=>c.id);
    marker.dataset.state=estado(head);
    marker.style.setProperty('--alert-color',estado(head)==='closed'?'#71817c':prioridad(head).color);
    marker.style.setProperty('--alert-opacity',responseState(head).opacity);
    marker.innerHTML=`<span class="alert-ripple"></span><span class="alert-ripple second"></span><span class="alert-core">${group.length>1?group.length:'<span class="alert-center"></span>'}</span>`;
    marker.setAttribute('aria-label', `${prioridad(head).label} · ${responseState(head).label}: ${group.length} caso(s) en ${head.municipio || 'esta ubicación'}`);
    marker.title=`${prioridad(head).label} · ${responseState(head).label} · ${nombreCaso(head)}`;
    marker.onclick=()=>seleccionarCasoMapa(head.id);
    const content = document.createElement('div');
    content.className = 'map-popup-cases';
    for (const c of group) {
      const btn = document.createElement('button');
      btn.className = 'map-case';
      btn.textContent = `${nombreCaso(c)} · ${prioridad(c).label} · ${origenUbicacion(c)}`;
      btn.onclick = () => seleccionarCasoMapa(c.id);
      content.append(btn);
    }
    entry.marker.setPopup(group.length>1?new maplibregl.Popup({offset:22}).setDOMContent(content):null);
  }
  mapMarkers=[...markerRegistry.values()].map(entry=>entry.marker);
}

function seleccionarCasoMapa(id) {
  const c=casos.find(c=>c.id===id);if(!c)return;
  selectedMapCaseId=id;
  if(territoryMap&&tieneCoordenadas(c))territoryMap.flyTo({center:[c.lng,c.lat],zoom:c.locationSource==='municipio'?10:13,duration:reducedMotion()?0:1100});
  document.querySelectorAll('.response-item').forEach(item=>item.classList.toggle('selected',item.dataset.caseId===id));
  renderInspectorMapa();
}
function renderInspectorMapa() {
  const c=casos.find(c=>c.id===selectedMapCaseId);if(!c)return;
  const panel=document.getElementById('map-inspector');panel.hidden=false;
  panel.innerHTML=`<div class="inspector-caption">CASO SELECCIONADO <button class="icon-button" aria-label="Cerrar selección" title="Cerrar selección" onclick="selectedMapCaseId=null;document.getElementById('map-inspector').hidden=true;renderMapa()"><i data-lucide="x"></i></button></div><h3>${escapeHTML(nombreCaso(c))}</h3><p>${escapeHTML(c.municipio||'Municipio pendiente')} · ${escapeHTML(c.departamento||'')}</p><div class="inspector-state"><span style="color:${responseState(c).color}">${responseState(c).label}</span><b>${responseState(c).progress}%</b></div><div class="case-progress-track"><span style="width:${responseState(c).progress}%;background:${responseState(c).color}"></span></div><p class="inspector-owner">Responsable<br><b>${escapeHTML(c.asignadoA||'Sin asignar')}</b></p><button class="ops-button primary" id="open-selected-case">Gestionar caso <i data-lucide="arrow-up-right"></i></button>`;
  document.getElementById('open-selected-case').onclick=()=>abrirCaso(c.id);
  refreshIcons();
}

function encuadrarMapa() {
  if (!territoryMap) return;
  territoryMap.resize();
  const bounds = currentDepFilter === 'Risaralda' ? [[-76.15,4.68],[-75.4,5.5]] : currentDepFilter === 'Chocó' ? [[-77.6,4.0],[-76.0,8.65]] : [[-77.6,4.0],[-75.35,8.65]];
  territoryMap.fitBounds(bounds,{padding:35,duration:0});
}

function abrirCaso(id) {
  const c = casos.find(c => c.id === id);
  if (!c) return;
  selectedCaseId = id;
  const previousNotice=document.getElementById('dialog-notice');
  if(previousNotice)previousNotice.hidden=true;
  document.getElementById('case-dialog-title').textContent = nombreCaso(c);
  document.getElementById('case-detail').innerHTML = `
    <p class="ops-muted">${escapeHTML(c.id)} · ${fecha(c.timestamp)}</p>
    <ol class="response-timeline" aria-label="Etapas de respuesta">${Object.entries(RESPONSE_STATES).map(([state,meta])=>`<li class="${meta.progress<=responseState(c).progress?'completed':''}"><span></span>${meta.label}</li>`).join('')}</ol>
    <dl class="case-facts"><dt>Prioridad</dt><dd>${prioridad(c).label} · ${Number(c.score)||0} puntos</dd><dt>Territorio</dt><dd>${escapeHTML(c.municipio)}, ${escapeHTML(c.departamento)}</dd><dt>Ubicación</dt><dd>${escapeHTML(origenUbicacion(c))}${tieneCoordenadas(c)?`<br>${c.lat.toFixed(6)}, ${c.lng.toFixed(6)}`:''}</dd><dt>Ruta sugerida</dt><dd>${escapeHTML(c.rutaSugerida||rutaSugerida(c.priority))}</dd></dl>
    <details class="case-location-editor"><summary>Completar identificación y ubicación</summary><div class="detail-form">
    <label for="edit-nombres">Nombres</label><input id="edit-nombres" value="${escapeHTML(c.nombres)}" maxlength="150">
    <label for="edit-apellidos">Apellidos</label><input id="edit-apellidos" value="${escapeHTML(c.apellidos)}" maxlength="150">
    <label for="edit-departamento">Departamento</label><select id="edit-departamento" onchange="municipiosEdicion()"><option value="">Selecciona…</option><option ${c.departamento==='Chocó'?'selected':''}>Chocó</option><option ${c.departamento==='Risaralda'?'selected':''}>Risaralda</option></select>
    <label for="edit-municipio">Municipio</label><select id="edit-municipio"></select>
    <label for="edit-coords">Coordenadas (opcional)</label><input id="edit-coords" value="${tieneCoordenadas(c)?`${c.lat}, ${c.lng}`:''}" placeholder="5.6947, -76.6611">
    <p class="ops-muted">Sin coordenadas se utiliza una referencia municipal aproximada.</p><button class="ops-button" onclick="guardarUbicacionCaso()">Guardar identificación y ubicación</button></div></details>
    <p class="ops-muted">Priorización orientativa del prototipo, pendiente de validación clínica. La asignación y el contacto institucional requieren revisión humana.</p>
    <h3>Factores registrados</h3><ul class="factor-list">${Array.isArray(c.factores)&&c.factores.length?c.factores.map(f=>`<li>${escapeHTML(f.t)}</li>`).join(''):'<li>Sin factores registrados.</li>'}</ul>
    <div class="detail-form"><label for="case-owner">Profesional responsable</label><input id="case-owner" maxlength="150" placeholder="Nombre del profesional" value="${escapeHTML(c.asignadoA||'')}"><label for="case-state">Estado</label><select id="case-state">${Object.entries(CASE_STATES).map(([key,label])=>`<option value="${key}" ${estado(c)===key?'selected':''}>${label}</option>`).join('')}</select><label for="case-note">Nota de seguimiento</label><textarea id="case-note" maxlength="2000" rows="3"></textarea><button class="ops-button primary" onclick="guardarGestion()">Guardar seguimiento</button></div>
    <h3>Historial</h3><ul class="history-list">${Array.isArray(c.history)&&c.history.length?c.history.slice().reverse().map(h=>`<li><b>${fecha(h.at)} · ${escapeHTML(CASE_STATES[h.status]||h.status)}</b><p>${escapeHTML(h.owner||'Sin responsable')} · ${escapeHTML(h.note||'Actualización de gestión')}</p></li>`).join(''):'<li>Aún no hay actuaciones registradas.</li>'}</ul>`;
  const dialog = document.getElementById('case-dialog');
  municipiosEdicion(c.municipio);
  if (!dialog.open) dialog.showModal();
}

function municipiosEdicion(selected = '') {
  const department = document.getElementById('edit-departamento').value;
  const items = department==='Chocó'?MUNICIPIOS_CHOCO:department==='Risaralda'?MUNICIPIOS_RISARALDA:[];
  document.getElementById('edit-municipio').innerHTML = '<option value="">Selecciona…</option>'+items.map(m=>`<option value="${escapeHTML(m.nombre)}" ${m.nombre===selected?'selected':''}>${escapeHTML(m.nombre)}</option>`).join('');
}
function guardarUbicacionCaso() {
  let c;
  try {c=getCasos().find(c=>c.id===selectedCaseId);} catch {notify('No se puede leer el registro original.',true);return;}
  if (!c) return;
  const nombres=document.getElementById('edit-nombres').value.trim();
  const apellidos=document.getElementById('edit-apellidos').value.trim();
  const departamento=document.getElementById('edit-departamento').value;
  const municipio=document.getElementById('edit-municipio').value;
  const coords=document.getElementById('edit-coords').value.trim();
  if (!nombres||!apellidos||!departamento||!municipio) {notify('Completa nombre, apellidos, departamento y municipio.',true);return;}
  let lat,lng,locationSource,locationAccuracy=null;
  if (coords) {
    const parts=coords.split(',');
    [lat,lng]=parts.map(v=>Number(v.trim()));
    if(parts.length!==2||parts.some(v=>!v.trim())||!tieneCoordenadas({lat,lng})) {notify('Revisa las coordenadas: latitud, longitud.',true);return;}
    locationSource=lat===c.lat&&lng===c.lng?c.locationSource||'legacy':'manual';
    if(locationSource==='gps')locationAccuracy=c.locationAccuracy||null;
  } else {
    const reference=(departamento==='Chocó'?MUNICIPIOS_CHOCO:MUNICIPIOS_RISARALDA).find(m=>m.nombre===municipio);
    if(!reference) {notify('Selecciona un municipio válido.',true);return;}
    ({lat,lng}=reference);locationSource='municipio';
  }
  const updated={...c,nombres,apellidos,departamento,municipio,lat,lng,locationSource,locationAccuracy,history:[...(Array.isArray(c.history)?c.history:[]),{at:new Date().toISOString(),status:estado(c),owner:c.asignadoA,note:'Identificación y ubicación actualizadas.',by:currentUser?.email}]};
  if(!persistirCaso(updated))return;
  updateStats();renderOperacion();abrirCaso(c.id);notify('Identificación y ubicación guardadas.');
}
function guardarGestion() {
  let latest;
  try {latest = getCasos();} catch {notify('No se puede leer el registro guardado. Se conservan los datos existentes.',true);return;}
  const c = latest.find(c => c.id === selectedCaseId);
  if (!c) {notify('Este caso ya no está disponible. Actualiza la página.',true);return;}
  const owner = document.getElementById('case-owner').value.trim();
  const status = document.getElementById('case-state').value;
  const note = document.getElementById('case-note').value.trim();
  if (status !== 'pending' && !owner) {notify('Indica el profesional responsable antes de cambiar el estado.',true);return;}
  const update = {...c, asignadoA:owner||null, status, history:[...(Array.isArray(c.history)?c.history:[]), {at:new Date().toISOString(), status, owner, note, by:currentUser?.email}]};
  if (!persistirCaso(update)) return;
  document.getElementById('case-dialog').close();
  updateStats();renderOperacion();notify('Seguimiento guardado.');
}

function graficaBarras(title, rows, total) {
  return `<section class="chart-section"><h3>${escapeHTML(title)}</h3>${rows.map(row=>`<div class="bar-row"><div><span>${escapeHTML(row.label)}</span><b>${row.value}</b></div><div class="bar-track"><div class="bar-fill" style="width:${total?Math.min(100,row.value/total*100):0}%;background:${row.color}"></div></div></div>`).join('')}${!total?'<p class="empty-state">Sin casos guardados para este filtro.</p>':''}</section>`;
}
function renderReportes() {
  const visible = casosTerritorio();
  document.getElementById('report-scope').textContent = `${currentDepFilter==='all'?'Chocó y Risaralda':currentDepFilter} · ${visible.length} caso(s) registrado(s)`;
  const metrics = [['Total de casos',visible.length],['Por atender',visible.filter(c=>estado(c)==='pending').length],['En atención',visible.filter(c=>estado(c)==='active').length],['Con coordenadas',visible.filter(tieneCoordenadas).length]];
  document.getElementById('report-metrics').innerHTML = metrics.map(([label,n])=>`<div><span>${label}</span><strong>${n}</strong></div>`).join('');
  const priorityRows = Object.entries(PRIORITIES).map(([p,meta])=>({label:meta.label,color:meta.color,value:visible.filter(c=>(Object.hasOwn(PRIORITIES,c.priority)?c.priority:'tbd')===p).length}));
  const depRows = ['Chocó','Risaralda'].map((label,i)=>({label,color:i?'#267caf':'#0d6e4f',value:visible.filter(c=>c.departamento===label).length}));
  const statusRows = Object.entries(CASE_STATES).map(([key,label],i)=>({label,color:['#b66c00','#267caf','#0d6e4f','#667085'][i],value:visible.filter(c=>estado(c)===key).length}));
  const municipalCounts = new Map();
  visible.forEach(c=>{const label=c.municipio||'Sin municipio';municipalCounts.set(label,(municipalCounts.get(label)||0)+1);});
  const muniRows = [...municipalCounts].sort((a,b)=>b[1]-a[1]).map(([label,value])=>({label,value,color:'#267caf'}));
  document.getElementById('report-charts').innerHTML = graficaBarras('Prioridad de atención',priorityRows,visible.length)+graficaBarras('Casos por departamento',depRows,visible.length)+graficaBarras('Estado de gestión',statusRows,visible.length)+graficaBarras('Casos por municipio',muniRows,visible.length);
}

function exportarRespaldo() {
  try {
    const records = getCasos();
    const blob = new Blob([JSON.stringify({format:'terrasana-casos',version:1,exportedAt:new Date().toISOString(),casos:records},null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');a.href=url;a.download=`terrasana-respaldo-${new Date().toISOString().slice(0,10)}.json`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    notify('Respaldo descargado. Contiene los datos personales de los casos.');
  } catch {notify('No se pudo generar el respaldo. Los datos existentes no se han modificado.',true);}
}

window.addEventListener('storage', event => {
  if (event.key !== K_CASOS || !currentUser) return;
  try {casos=getCasos();storageHealthy=true;updateStats();renderOperacion();}
  catch {storageHealthy=false;notify('Otra pestaña cambió los datos a un formato que no se puede leer.',true);}
});
document.querySelector('.form-wizard').addEventListener('change', calcularScore);
// Link labels to their inputs for keyboard and screen-reader navigation.
document.querySelectorAll('.form-group').forEach(group=>{const label=group.querySelector('label');const input=group.querySelector('input[id],select[id],textarea[id]');if(label&&input)label.htmlFor=input.id;});
document.addEventListener('DOMContentLoaded',refreshIcons);
window.addEventListener('resize',()=>territoryMap?.resize());
