'use strict';
let pendingInstall = null;
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  pendingInstall = event;
  document.getElementById('install-app').hidden = false;
});
window.addEventListener('appinstalled', () => {
  pendingInstall = null;
  document.getElementById('install-app').hidden = true;
});
async function installApplication() {
  if (!pendingInstall) return;
  await pendingInstall.prompt();
  await pendingInstall.userChoice;
  pendingInstall = null;
  document.getElementById('install-app').hidden = true;
}
if ('serviceWorker' in navigator && window.isSecureContext) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(() => {
      console.warn('TERRASANA: acceso sin conexión no disponible en este navegador.');
    });
  });
}
window.addEventListener('offline', () => notify('Sin conexión. Los registros permanecen en este dispositivo; la cartografía puede no estar disponible.'));
window.addEventListener('online', () => {if(currentView==='map')renderMapa();});
