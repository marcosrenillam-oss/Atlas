# Arquitectura de ATLAS

## Principios

1. **Local primero.** IndexedDB es la fuente de verdad. Ninguna pantalla espera a la red.
2. **Sin dependencias de pago.** Todo servicio externo es opcional y la app lo indica cuando falta conexión.
3. **Capas separadas:** interfaz (`features/`, `ui/`), lógica de negocio pura (`domain/`, `lib/`), datos (`data/`), sincronización (`sync/`), mapas (`maps/`) y archivos (`files/`).

## Datos

- **Dexie 4** sobre IndexedDB (`src/data/db.ts`). Tablas: `trips`, `participants`, `items`, `places`, `categories`, `expenses`, `settlements`, `docs`, `files`, `packingLists`, `packingItems`, `tasks`, `outbox` y `kv`.
- Los binarios (fotos, PDF) se guardan como `Blob` en `files`. Las fotos se reducen a un máximo de 1600–1800 px; los documentos se guardan intactos.
- Toda escritura pasa por `src/data/repo.ts`, que:
  - sella `createdAt` y `updatedAt`;
  - si la sincronización está activa, añade la operación a `outbox` dentro de la misma transacción, con un solo registro pendiente por entidad;
  - borra en cascada al eliminar un viaje o una lista.
- Las pantallas leen con `useLiveQuery`, así que cualquier cambio local o remoto se refleja solo.
- Al primer arranque, `seed.ts` crea las categorías base y las plantillas de equipaje con identificadores estables, lo que evita duplicados al sincronizar.

## Dinero

- Siempre en **unidades menores enteras** (céntimos; 0 decimales para JPY y similares).
- `parseAmount` entiende `1.234,56`, `1234.56` y `12,5`, y redondea half-up con aritmética de enteros.
- `allocate` reparte por el método del mayor resto: la suma de las partes es siempre exactamente el total.
- `convertMinor` aplica tipos de cambio manuales con `BigInt`.
- `balances` y `settleUp` calculan saldos, que siempre suman 0, y las transferencias para quedar en paz.

## Offline y PWA

- `vite-plugin-pwa` genera el Service Worker con Workbox. Precachea JS, CSS, HTML e iconos (unos 800 KB) y sirve `index.html` en todas las rutas.
- Actualizaciones con aviso («Hay una versión nueva · Actualizar») y comprobación al volver a primer plano.
- `navigator.storage.persist()` se solicita al crear el primer viaje, y también desde Perfil.
- Manifest, `apple-touch-icon`, `apple-mobile-web-app-capable` y 24 splash screens de iOS (claro y oscuro).

## Sincronización (opcional)

- `src/sync/transport.ts` define una interfaz `SyncTransport` independiente del proveedor (`check`, `push`, `pull`). La implementación incluida es HTTP contra `server/sync-server.mjs`.
- El motor (`engine.ts`):
  1. Envía la cola filtrando por viajes con `shared: true`.
  2. Descarga desde un cursor (`seq`).
  3. Aplica los cambios con **última escritura gana** por `updatedAt`, sin reencolarlos.
- Se dispara al arrancar, al volver la red, al volver a primer plano, tras cambios locales (con 2,5 s de espera) y cada 60 s con la app visible. No usa Background Sync, porque iOS no lo garantiza.
- El servidor guarda el último cambio de cada registro, asigna `seq` creciente y rechaza versiones más antiguas.

## Mapas

- `maps/provider.ts`: lista de proveedores de teselas; hoy, OpenStreetMap. Para cambiar de proveedor basta con añadir otra entrada.
- `MapView` usa Leaflet. Sin conexión, o si las teselas fallan, muestra `OfflinePlot`: una proyección equirectangular corregida por latitud, con escala aproximada.
- Las teselas no se cachean en el Service Worker, por la política de uso de OSM.
- La búsqueda (`geocode.ts`) usa Nominatim con un máximo de 1 petición/s, sin autocompletado y con caché en memoria.

## Pruebas

- `tests/unit`: dinero, repartos, saldos, liquidaciones, estados, duplicado y borrado en cascada, copia completa con binarios, importación con combinación y cola de sincronización (con `fake-indexeddb`).
- `tests/e2e/run.mjs`: Playwright con perfil iPhone 13 mini e iPhone SE, contra la build de producción con Service Worker. Cubre 25 escenarios, entre ellos el modo avión, la recarga sin conexión, la exportación y restauración, la sincronización entre dos dispositivos con cola offline, el modo oscuro, la ausencia de desbordamiento horizontal a 320 px, objetivos táctiles de 44 px o más, y cero errores de consola.
