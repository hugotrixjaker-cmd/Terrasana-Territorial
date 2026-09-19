# TERRASANA: caracterización y operación local

Esta versión incorpora el formulario existente, guardado local, mapa de casos,
bandeja por estado, asignación de responsable, historial y gráficas territoriales.

## Abrir

El servidor del equipo está disponible en http://127.0.0.1:8765/.
Para iniciarlo de nuevo, desde esta carpeta con Python instalado:

```powershell
python -m http.server 8765 --bind 127.0.0.1
```

Mantener todos los archivos de esta carpeta juntos. Usar siempre el mismo
navegador y la misma dirección: localhost y 127.0.0.1 tienen almacenamientos
distintos, al igual que otros puertos. El servidor sirve los archivos; los casos
se almacenan en el navegador, no en Python ni en una base de datos compartida.

## Registrar y consultar

1. Ingresar y abrir Nueva caracterización.
2. Completar los seis pasos y calcular el resultado.
3. Pulsar Guardar y enviar a bandeja. Calcular el resultado por sí solo no guarda.
4. Abrir el caso para asignar un profesional o registrar seguimiento.
5. Consultar Mapa territorial y Reportes. El filtro de departamento se aplica a
   esas vistas y a los contadores; el filtro de prioridad corresponde a la bandeja.

En la ficha, Completar identificación y ubicación permite corregir registros
anteriores que hayan quedado sin nombre o coordenadas, conservando su ID e historial.

No se insertan casos ficticios automáticamente. Los reportes muestran cero cuando
no hay registros para el filtro seleccionado. Descargar respaldo exporta los casos
a JSON, con sus datos personales; esta versión no incorpora importación del JSON.

## Ubicaciones

Las coordenadas pueden capturarse con permiso del dispositivo o ingresarse
manualmente. Sin coordenadas, se usa una referencia municipal identificada como
aproximada. No se añaden desplazamientos aleatorios. Los registros antiguos
conservan sus coordenadas y aparecen como ubicación sin verificar, porque la
versión anterior podía haberlas desplazado.

Los casos coincidentes se agrupan en un marcador que permite abrir cada ficha.
El mapa necesita internet para cargar las imágenes cartográficas. MapLibre y
las demás bibliotecas están incluidas en el paquete.
Los nombres y fichas se dibujan localmente; no se envían como contenido al servicio
cartográfico. Las solicitudes de cartografía corresponden al área visualizada.

Referencias técnicas:
- https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/
- https://operations.osmfoundation.org/policies/tiles/

## Alcance

Firebase y la sincronización entre equipos no están configurados. El acceso
actual es un prototipo local, sin autenticación de servidor ni control de acceso
centralizado. No envía alertas a entidades ni asigna profesionales externamente.

Se conserva la ponderación del formulario recibido. El puntaje no es una escala
clínica validada; la ruta es una sugerencia para revisión humana. Se retiró el
denominador de 130 puntos, que no correspondía a la suma del código original.

El navegador debe permitir almacenamiento. Si se bloquea, se llena o no se pueden
leer los registros, se informa el error y no se confirma un guardado exitoso.
La información existente no se sustituye silenciosamente por una lista vacía.
No cerrar el formulario ante un error de guardado.

## Verificación

```powershell
node --test tests/operacion.test.cjs tests/publicacion.test.cjs tests/informe.test.cjs
```

Se verificaron dieciséis pruebas de persistencia, errores de almacenamiento,
validación de coordenadas, duplicados, filtros y escape de contenido.
También se probó en navegador el recorrido de los seis pasos, el guardado,
la recarga, el mapa, la gestión de casos y las gráficas en escritorio y móvil.
Las pruebas interactivas utilizaron un origen separado de la dirección del usuario.

La versión actual incluye animaciones de carga e interacción, puntos por prioridad,
desvanecimiento según estado de atención, visor y descarga PDF y soporte PWA.
Consulta README.md y PUBLICAR_EN_GITHUB.md para la publicación e instalación móvil.
