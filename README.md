# TERRASANA - Centro territorial

Plataforma web instalable para caracterización, priorización orientativa y
seguimiento de casos en Chocó y Risaralda. Funciona como sitio estático.

## Incluye

- Pantalla inicial de carga y animaciones de interacción.
- Mapa con puntos por prioridad: rojo crítico, ámbar alto, verde seguimiento.
- Intensidad del punto según el avance de respuesta. Al cerrar un caso, su punto
  se desvanece del mapa activo; Mostrar cerrados permite volver a consultarlo.
- Cola de respuesta, selección de casos, asignación e historial.
- Formulario de seis pasos, bandeja y gráficas.
- Vista previa y descarga de informe PDF con los registros del territorio filtrado.
- Aplicación instalable (PWA) y acceso sin conexión al software ya cargado.

## Abrir en este equipo

Desde la carpeta que contiene index.html:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Visita http://127.0.0.1:8765/ en el mismo navegador donde guardaste los casos.
Para instalar desde un teléfono necesitas publicar con HTTPS; localhost apunta
al dispositivo desde el que se abre y no es un enlace compartible.

## Publicar y obtener enlace

Sigue [PUBLICAR_EN_GITHUB.md](PUBLICAR_EN_GITHUB.md).
No necesitas instalar Unity, Node ni otras herramientas para utilizar la web.
El diseño está inspirado en un centro de operaciones; no es un proyecto Unity.

## Datos y alcance

Los casos permanecen en el almacenamiento local de cada navegador. Publicar en
GitHub Pages no crea una base de datos compartida. Los registros del equipo local
no aparecen automáticamente en el dominio publicado o en otro teléfono.

El ZIP no incluye bases de datos ni los PDF generados con casos personales.
Los PDF y respaldos descargados deben conservarse fuera del repositorio público.
El informe se genera localmente y no envía las fichas a un servidor externo.

Las coordenadas municipales son aproximadas. Los datos GPS/manuales nuevos no se
desplazan al azar. Los registros antiguos conservan su ubicación sin verificar.
La cartografía de OpenStreetMap necesita internet y no se descarga para uso offline.

La prioridad proviene de las reglas del prototipo y requiere validación clínica.
La intensidad visual representa estados administrativos de respuesta, no mejoría
de salud ni porcentaje de recuperación. El cierre no borra el caso.

## Pruebas y compilación opcionales

```powershell
node --test tests/operacion.test.cjs tests/publicacion.test.cjs tests/informe.test.cjs
node scripts/build-site.cjs
```

El directorio _site contiene únicamente los archivos de la aplicación publicable.
La reconstrucción opcional de iconos requiere sharp. Los iconos PNG ya están incluidos.

## Bibliotecas incluidas

MapLibre GL JS 3.6.2, Lucide 0.468.0, jsPDF 4.2.1,
jsPDF-AutoTable 5.0.8 y PDF.js 6.3.289. Sus licencias están en vendor.

Documentación de referencia:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://operations.osmfoundation.org/policies/tiles/
