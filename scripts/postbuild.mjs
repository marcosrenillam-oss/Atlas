// Copia index.html a 404.html para que las rutas internas funcionen en hosting estático (GitHub Pages).
import { copyFileSync, existsSync } from 'node:fs';
const src = new URL('../dist/index.html', import.meta.url);
if (existsSync(src)) copyFileSync(src, new URL('../dist/404.html', import.meta.url));
