// Genera iconos PNG y pantallas de arranque (splash) de iOS a partir de public/icons/atlas.svg
// usando Chromium (Playwright). Uso: npm run icons
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
// Playwright puede venir global (require) o como dependencia del proyecto.
const { chromium } = require('playwright');
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const svg = readFileSync(join(root, 'public/icons/atlas.svg'), 'utf8');
const out = join(root, 'public/icons');
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage();

async function shot(file, w, h, html) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(`<html><body style="margin:0">${html}</body></html>`);
  const jpeg = file.endsWith('.jpg');
  await page.screenshot({ path: join(out, file), type: jpeg ? 'jpeg' : 'png', ...(jpeg ? { quality: 82 } : {}) });
}
const icon = (size, pad = 0) =>
  `<div style="width:${size}px;height:${size}px;background:linear-gradient(135deg,#FF8A3D,#FF4F8B 50%,#6A4CFF);display:grid;place-items:center">
     <div style="width:${size - pad * 2}px;height:${size - pad * 2}px">${svg.replace('<svg', '<svg width="100%" height="100%"')}</div></div>`;

await shot('icon-192.png', 192, 192, icon(192));
await shot('icon-512.png', 512, 512, icon(512));
await shot('icon-maskable-512.png', 512, 512, icon(512, 70));
await shot('apple-touch-icon.png', 180, 180, icon(180));

// Splash screens (tamaños en píxeles físicos de iPhones habituales, vertical).
const splashes = [
  [640, 1136], [750, 1334], [828, 1792], [1125, 2436], [1170, 2532], [1179, 2556],
  [1242, 2688], [1284, 2778], [1290, 2796], [1206, 2622], [1320, 2868], [1080, 2340],
];
for (const [w, h] of splashes) {
  for (const [mode, bg, fg] of [['light', 'radial-gradient(circle at 15% 10%,#ffc9a8,transparent 55%),radial-gradient(circle at 90% 25%,#d6c9ff,transparent 55%),#FBF5EF', '#1B1530'], ['dark', 'radial-gradient(circle at 15% 10%,#3b1f8f,transparent 55%),radial-gradient(circle at 90% 30%,#6b1250,transparent 55%),#0C0920', '#F5F2FF']]) {
    const s = Math.round(w * 0.22);
    await shot(`splash-${w}x${h}-${mode}.jpg`, w, h,
      `<div style="width:${w}px;height:${h}px;background:${bg};display:flex;flex-direction:column;align-items:center;justify-content:center;gap:${Math.round(s * 0.28)}px;font-family:-apple-system,system-ui,sans-serif">
        <div style="width:${s}px;height:${s}px;border-radius:${Math.round(s * 0.225)}px;overflow:hidden">${icon(s)}</div>
        <div style="color:${fg};font-size:${Math.round(w * 0.045)}px;font-weight:600;letter-spacing:.18em">ATLAS</div></div>`);
  }
}
await browser.close();
console.log('Iconos y splash generados en public/icons');
