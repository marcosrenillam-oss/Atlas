// Genera src/ui/cover-photos.json: qué foto de monumento (public/world/<id>.jpg) usar como portada
// de un viaje según el país o la ciudad del destino. Uso: node scripts/gen-cover-photos.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const credits = JSON.parse(readFileSync('public/world/credits.json', 'utf8'));
const out = { byCountry: {}, byName: {}, credit: {} };
for (const region of ['eu', 'am', 'af', 'as', 'oc']) {
  for (const r of JSON.parse(readFileSync(`src/features/world/data/${region}.json`, 'utf8'))) {
    const [id, , country, cc, city] = r;
    if (!credits[id]) continue; // sin foto
    out.byCountry[cc] = id;
    out.byName[norm(country)] = id;
    for (const c of city.split(/[,·]/)) if (c.trim()) out.byName[norm(c)] ??= id;
    const a = credits[id].author.replace(/\s+/g, ' ').slice(0, 48);
    out.credit[id] = `${a} · ${credits[id].license} · Wikimedia Commons`;
  }
}
writeFileSync('src/ui/cover-photos.json', JSON.stringify(out));
console.log(Object.keys(out.byCountry).length, 'países,', Object.keys(out.byName).length, 'nombres');
