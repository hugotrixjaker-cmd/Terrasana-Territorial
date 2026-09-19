# Publicar TERRASANA y obtener el enlace

1. Descomprime el ZIP. En GitHub, crea un repositorio nuevo, por ejemplo
   terrasana, en tu cuenta. Para GitHub Free utiliza un repositorio público.
2. En el repositorio, elige Add file > Upload files. Sube los archivos y carpetas
   descomprimidos, no el ZIP. index.html debe quedar en la raíz del repositorio,
   junto a vendor, assets, tests, scripts y la carpeta .github. No subas los PDF ni
   los respaldos JSON que descargues desde la aplicación.
3. Confirma la carga en la rama main. Abre Settings > Pages y selecciona
   GitHub Actions en Source.
4. Abre Actions > Publicar TERRASANA > Run workflow y selecciona main.
   El flujo incluido ejecuta las pruebas, prepara los archivos públicos y publica.
5. Espera a que los pasos aparezcan en verde. El enlace definitivo se muestra en
   Settings > Pages y en el resultado del despliegue. Tendrá la forma
   https://TU-USUARIO.github.io/TU-REPOSITORIO/ . Este ejemplo no es un enlace
   publicado: los valores dependen de tu cuenta y del nombre elegido.

Si el repositorio no muestra el flujo Publicar TERRASANA, revisa que hayas subido
el archivo .github/workflows/pages.yml conservando sus carpetas. Si un flujo falló
antes de configurar Pages, vuelve a ejecutarlo después del paso 3.

## Instalar en el celular

Abre el enlace HTTPS publicado en el navegador del teléfono.

- Android (Chrome/Edge): utiliza Instalar aplicación o Añadir a pantalla de inicio.
  TERRASANA muestra además un botón de instalación cuando el navegador lo permite.
- iPhone/iPad (Safari): Compartir > Añadir a pantalla de inicio.

Después de la primera carga completa, la interfaz, las fichas guardadas en ese
dispositivo y el generador de PDF pueden funcionar sin internet. El mapa base
requiere conexión. No es un APK ni una publicación en las tiendas de aplicaciones.

## Usar el informe

En Reportes, selecciona el territorio y pulsa Ver PDF o Descargar PDF. El documento
incluye resumen de prioridades, estados, calidad de datos, inventario y fichas.
Un registro sin coordenadas queda documentado, pero no tiene un punto geográfico.

## Actualizaciones

Sube los archivos modificados a main. El flujo volverá a publicarlos. Si se cambian
los archivos de la interfaz, incrementa la versión CACHE_NAME de sw.js para renovar
la copia disponible sin conexión. Conserva la misma dirección para acceder a los
casos ya guardados en ese navegador.
