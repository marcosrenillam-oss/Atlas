# ATLAS — Travel Control Center

**Diseño Aurora:** fondo aurora animado, superficies de cristal, cursiva serif en degradado, anillos de progreso, contadores animados y destellos al completar tareas. Modo claro (amanecer) y oscuro (noche estrellada). Respeta «Reducir movimiento» de iOS.

Aplicación web progresiva (PWA) para planificar y gestionar viajes. Es **offline-first**: todo se guarda en tu dispositivo, funciona en modo avión y no necesita cuentas, suscripciones ni servicios de pago.

- **Viajes ilimitados** con varios destinos y etapas, estados (en preparación, próximo, en curso, completado, archivado), búsqueda, filtros, orden, duplicado y archivo.
- **Itinerario por días** con línea temporal: actividades, visitas, restaurantes, transportes, alojamientos, eventos, reservas y notas, con hora, duración, ubicación, localizador, notas y fotos.
- **Mapas** con OpenStreetMap y lugares guardados por categorías. Sin conexión se muestra un plano local con tus puntos.
- **Gastos compartidos** en céntimos exactos, con tres modos de reparto, saldos, liquidación de deudas, pagos registrados, gráficos, varias monedas y categorías propias.
- **Documentos** (PDF, imágenes y otros) guardados en el dispositivo y consultables sin conexión.
- **Equipaje** con listas, cantidades, categorías y plantillas reutilizables: urbano, vacaciones, nieve, snowboard, playa y fin de semana.
- **Copias de seguridad** completas, exportación e importación de viajes sueltos y **sincronización opcional** con un servidor propio gratuito.

---

## 1. Instalación y desarrollo

Requisitos: Node.js 20 o superior (probado con 22).

```bash
npm install
```

```bash
npm run dev
```

Abre la dirección que indica la terminal. Para probarlo en tu iPhone dentro de la misma wifi:

```bash
npx vite --host
```

Y abre `http://IP-DE-TU-ORDENADOR:5173` en Safari. Ojo: el Service Worker y la instalación solo funcionan del todo en **HTTPS** o en `localhost`, así que para probar el modo offline en el iPhone publícalo (sección 2).

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Build de producción en `dist/` (comprueba tipos antes) |
| `npm run preview` | Sirve la build en `http://localhost:4173` |
| `npm test` | Pruebas unitarias (dinero, repartos, saldos, copias, datos) |
| `npm run build && npm run e2e` | Pruebas de extremo a extremo en iPhone emulado (requiere Playwright) |
| `npm run icons` | Regenera iconos y splash screens desde `public/icons/atlas.svg` |
| `npm run sync-server` | Arranca el servidor de sincronización opcional |

## 2. Publicación gratuita

ATLAS es una web estática: basta con alojar la carpeta `dist/`. No necesita backend.

### Opción A — GitHub Pages (incluida)

1. Sube el proyecto a un repositorio de GitHub. En el plan gratuito, el repositorio tiene que ser **público** para usar Pages.
2. En **Settings › Pages › Build and deployment › Source**, elige **GitHub Actions**.
3. Haz push a `main`. El flujo `.github/workflows/deploy.yml` ejecuta las pruebas, compila y publica.
4. La app queda en `https://TU-USUARIO.github.io/NOMBRE-DEL-REPO/`.

Límites oficiales de GitHub Pages: sitio publicado de hasta 1 GB, ancho de banda con límite blando de 100 GB al mes, y límite blando de 10 builds por hora (no aplica a los despliegues con Actions). ATLAS ocupa unos 2 MB.

### Opción B — Cloudflare Pages

1. Conecta el repositorio en Cloudflare Pages.
2. Comando de build: `npm run build`. Carpeta de salida: `dist`.
3. Si se publica en la raíz del dominio no hace falta `BASE_PATH`.

Plan gratuito: 500 builds al mes, 20.000 archivos y 25 MiB por archivo.

### Instalar en el iPhone

1. En el iPhone, abre **Safari** (tiene que ser Safari) y entra en la dirección publicada, por ejemplo `https://marcosrenillam-oss.github.io/atlas/`.
2. Pulsa el botón **Compartir** (el cuadrado con la flecha hacia arriba, abajo en el centro).
3. Desliza hacia abajo y pulsa **«Añadir a pantalla de inicio»**. Si no aparece, pulsa «Editar acciones» y añádelo.
4. Deja el nombre «ATLAS» y pulsa **Añadir**. Aparecerá el icono degradado en tu pantalla de inicio.
5. Abre ATLAS **desde el icono** una vez con conexión. Al cabo de unos segundos verás «ATLAS ya funciona sin conexión».

A partir de ahí, **usa siempre ATLAS desde el icono**, no desde una pestaña de Safari. En iOS, la app instalada y Safari guardan sus datos por separado: lo que crees en una pestaña de Safari no aparece en la app del icono, y al revés.

### Actualizaciones automáticas y tus datos

- Cada cambio que se sube a la rama `main` se publica solo, con GitHub Actions, en 1 o 2 minutos.
- Al abrir ATLAS desde el icono, o al volver a ella, la app busca una versión nueva. Si la hay, se descarga en segundo plano y se aplica sola; verás el aviso «ATLAS se ha actualizado a la última versión ✨». Si tienes un formulario abierto, espera a que lo cierres para no perder lo que estás escribiendo. Si la abres justo después de publicar un cambio, puede que tengas que cerrarla y abrirla otra vez para verlo.
- **Las actualizaciones nunca borran datos.** Viajes, gastos, documentos y fotos viven en el almacenamiento del iPhone (IndexedDB), separado del código de la app. Entrar, salir, cerrar la app o actualizarla no los toca.
- Lo único que **sí** borra los datos:
  - **Eliminar el icono de la pantalla de inicio.** iOS borra el almacenamiento de esa web app.
  - Usar «Borrar todos los datos» en Perfil, que pide doble confirmación.
  - Cambiar la dirección web de la app: los datos están ligados a la dirección exacta. Por eso **no hay que cambiar nunca el nombre del repositorio**.
- Por si acaso, exporta una copia desde **Perfil › Copias de seguridad** antes de cada viaje.

## 3. Uso sin conexión

Una vez abierta con conexión, la app entera (código, estilos e iconos) queda en caché del Service Worker. Sin conexión puedes:

- Abrir la app y consultar, crear, editar, duplicar y archivar viajes.
- Crear y modificar el itinerario, y marcar actividades y tareas.
- Registrar gastos, repartos y pagos.
- Ver los documentos y fotos importados.
- Crear y marcar listas de equipaje.
- Consultar tus lugares guardados con sus coordenadas, en un plano local.

Necesita conexión, y la app lo indica en cada caso:

- Mapa base de OpenStreetMap.
- Buscar lugares nuevos.
- Buscar fotos de portada en Wikipedia.
- Navegación externa en Apple Maps o Google Maps.
- Sincronización.

Sin conexión, en vez de buscar, puedes pegar coordenadas o usar el GPS («Usar mi ubicación»).

Los estados que verás:

- **Sin conexión** (franja superior): todo se guarda en el dispositivo.
- **Conectado · Solo en este dispositivo**: no hay sincronización configurada.
- **N cambios pendientes**: hay cambios esperando a enviarse a tu servidor.
- **Sincronizado HH:MM**: última sincronización correcta.

## 4. Copias de seguridad

**Perfil › Copias de seguridad › Exportar copia completa** genera un archivo `.atlas.json` con todos los viajes, gastos, lugares, listas, plantillas, el perfil, los documentos y las fotos (en base64). En iPhone se abre la hoja de compartir para guardarlo en Archivos o iCloud Drive.

Para restaurar: **Perfil › Importar copia o viaje**. Hay dos modos:

- **Combinar**: añade lo que falta y, para cada elemento, conserva la versión editada más recientemente.
- **Reemplazar**: borra antes todos los datos del dispositivo.

Para compartir un solo viaje: menú **⋯** del viaje › **Exportar para compartir**. La otra persona lo importa desde su Perfil. Si lo reimporta más tarde, se actualiza en vez de duplicarse.

Recomendación: exporta una copia antes de cada viaje y al volver.

## 5. Sincronización opcional (servidor propio y gratuito)

No es necesaria. Sirve para compartir viajes entre tus dispositivos o con acompañantes.

1. En un ordenador, Raspberry Pi o NAS con Node 18 o superior:

   ```bash
   ATLAS_SYNC_TOKEN="una-clave-larga-y-aleatoria" PORT=8787 node server/sync-server.mjs
   ```

2. Exponlo por HTTPS. Una opción gratuita es [Tailscale](https://tailscale.com) con `tailscale serve`, accesible solo para tus dispositivos. Otra es Caddy con tu propio dominio.
3. En ATLAS: **Perfil › Sincronización**. Introduce la dirección, el **espacio** (por ejemplo `familia-garcia`) y la clave. Haz lo mismo en los demás dispositivos o personas.
4. En el **Resumen** del viaje, activa **Sincronizar este viaje**. Solo se envían los viajes marcados.

Cómo funciona:

- Cola persistente de cambios en IndexedDB.
- Envío y recepción cuando hay conexión **y la app está abierta**: al abrirla, al volver a primer plano, al recuperar la red y cada minuto. iOS no garantiza ejecución en segundo plano para PWA y ATLAS no depende de ella.
- Los conflictos se resuelven por elemento: gana la última edición.
- Los datos se guardan en `server/data/<espacio>.json`.
- Archivos de hasta 15 MB por documento. Los mayores se quedan solo en local.

## 6. Funciones por sección

| Sección | Contenido |
|---|---|
| **Inicio** | Saludo y fecha, próximo viaje con cuenta atrás (o «Día N de M» si está en curso), próximos viajes, viajes en preparación, tareas pendientes de todos los viajes, gastos del año y pendientes, accesos rápidos e historial reciente |
| **Viajes** | Próximos, Preparación, Completados y Archivados con contadores; buscador por nombre, destino o descripción; filtro por tipo; orden por fecha, nombre o edición; crear, editar, duplicar, exportar, archivar y eliminar |
| **Viaje › Resumen** | Próxima actividad, destinos con etapas, fechas, viajeros (nombre, identificador, permisos y visibilidad de gastos), alojamiento y transporte tomados del itinerario, presupuesto, tareas, descripción y opciones de compartir |
| **Viaje › Itinerario** | Vista por día con selector de días e «Ideas» sin fecha, y vista resumen. Cada elemento se puede editar, duplicar, subir, bajar, mover a otro día, completar y eliminar, y abrir en Apple o Google Maps. Al poner una hora, se ordena solo |
| **Viaje › Mapa** | Lugares por categoría, recorrido de un día (líneas rectas entre paradas, con km aproximados; no es una ruta) y alta de lugares tocando el mapa |
| **Viaje › Gastos** | Total, disponible y presupuesto; lista por día con filtros; gastos pagados o pendientes; pagos en otra moneda con tipo de cambio manual; reparto a partes iguales, por partes o por importes; saldos, propuesta para quedar en paz, pagos registrados y gráficos por categoría, persona y día |
| **Viaje › Documentos** | Importación múltiple (hasta 80 MB por archivo), tipo detectado por el nombre y editable, descripción, visor de imágenes y PDF, compartir o guardar |
| **Viaje › Equipaje** | Varias listas por viaje, desde plantilla o vacías; categorías, cantidades, ocultar lo preparado, desmarcar todo, duplicar, guardar como plantilla y gestionar plantillas |
| **Explorar** | Todos tus lugares (generales o de cada viaje) en mapa y lista; búsqueda; categorías; ficha con notas, fotos, coordenadas, enlace, navegación externa y «Añadir al itinerario» de cualquier viaje |
| **Gastos** | Resumen de todos los viajes por moneda, tu saldo global, gráfico por categorías y avance de cada presupuesto |
| **Perfil** | Nombre, apariencia (automática, clara u oscura), moneda predeterminada, copias, sincronización, almacenamiento (uso, persistencia, limpieza de archivos sin uso), instalación, privacidad y borrado total con doble confirmación |

## 7. Limitaciones reales

- **Mapas sin conexión**: la política de OpenStreetMap prohíbe descargar teselas para uso offline, así que ATLAS no lo hace. Sin conexión verás un plano local esquemático con tus puntos, distancias aproximadas y el norte, no un mapa. Para tener cartografía offline habría que autoalojar teselas (por ejemplo, un archivo PMTiles) y añadirlas en `src/maps/provider.ts`.
- **Rutas**: ATLAS no calcula rutas. El «recorrido del día» une las paradas en línea recta. Para navegar, usa los botones de Apple Maps o Google Maps.
- **Búsqueda de lugares**: depende de Nominatim, gratuito con condiciones: máximo una petición por segundo, sin autocompletado y servicio sin garantías. Solo funciona con conexión.
- **Fotos de Wikipedia**: no todos los destinos tienen imagen, y su licencia depende de cada archivo. Se guarda el crédito y el enlace a la página.
- **PDF en iPhone**: el visor integrado de Safari a veces solo muestra la primera página. Usa «Compartir» para abrirlo en el visor del sistema.
- **Sincronización**: no es en tiempo real; solo se ejecuta con la app abierta. Los permisos de viajeros son informativos: cualquiera con la clave del espacio accede a los viajes compartidos en él. No hay cifrado de extremo a extremo, así que usa HTTPS y tu propio servidor.
- **Espacio**: depende del navegador. Safari en iPhone suele permitir varios GB a las apps instaladas, pero no hay una cifra garantizada. El uso real aparece en Perfil.
- **Tipos de cambio**: los introduces tú; ATLAS no consulta cambios en Internet.
- **Idiomas**: la interfaz está en español. La estructura `src/i18n/` está preparada, pero de momento solo la navegación, las acciones comunes, los estados y las pestañas pasan por el diccionario; el resto de textos están en los componentes y habría que extraerlos para traducir la app.
- **Probado**: en Chromium emulando iPhone 13 mini e iPhone SE, incluidos el modo avión, la persistencia y la sincronización. **No se ha probado en un iPhone físico con Safari**: conviene hacer una prueba de instalación real antes de viajar.

## 8. Servicios externos y costes

| Servicio | Para qué | Coste | Condiciones |
|---|---|---|---|
| OpenStreetMap (teselas) | Mapa base, solo con conexión | Gratis | Atribución visible; prohibida la descarga masiva u offline; sin garantía de servicio |
| Nominatim (OSM) | Buscar lugares, al pulsar Buscar | Gratis | Máximo 1 petición/s, sin autocompletado, atribución |
| Wikipedia REST API | Foto de portada opcional | Gratis | Sin clave; licencias de cada imagen en Wikimedia |
| Apple Maps / Google Maps | Enlaces de navegación externa | Gratis | Abre la app de mapas del dispositivo |
| GitHub Pages / Cloudflare Pages | Alojar la web | Gratis | Ver límites en la sección 2 |
| Servidor de sincronización propio | Opcional | Gratis en tu equipo | Tú lo mantienes |

No hay APIs de pago, claves, analítica, anuncios ni suscripciones. Si no configuras nada, la app funciona entera en local.

## 9. Estructura del proyecto

```
atlas/
├─ index.html                 Metadatos iOS, iconos y splash screens
├─ vite.config.ts             Vite + PWA (Service Worker con Workbox)
├─ public/icons/              Icono SVG, PNG generados y splash de iOS
├─ src/
│  ├─ main.tsx                Arranque: tema, datos iniciales y sincronización
│  ├─ app/                    Armazón: rutas, barras, tema, estado de red
│  ├─ styles/app.css          Sistema visual (tokens claro/oscuro y componentes)
│  ├─ i18n/                   Diccionarios (es)
│  ├─ lib/                    Dinero en céntimos, fechas, identificadores
│  ├─ domain/                 Tipos, estados, repartos y saldos, plantillas
│  ├─ data/                   Dexie (IndexedDB), repositorio, consultas, copias
│  ├─ sync/                   Motor de sincronización y transporte HTTP
│  ├─ maps/                   Proveedor de mapas, Leaflet, plano offline, búsqueda
│  ├─ files/                  Archivos locales, compresión de fotos
│  ├─ ui/                     Componentes reutilizables (hojas, gráficos, controles)
│  └─ features/               Pantallas: home, trips, trip/*, places, explore, expenses, profile
├─ server/sync-server.mjs     Servidor de sincronización opcional (sin dependencias)
├─ tests/unit/                Vitest
├─ tests/e2e/run.mjs          Playwright: 25 escenarios en iPhone emulado
├─ docs/ARQUITECTURA.md       Decisiones técnicas
└─ .github/workflows/         Despliegue gratuito en GitHub Pages
```

Licencia MIT.
