#!/usr/bin/env python3
"""Descarga una vez las fotos de los monumentos desde Wikimedia Commons (con autor y licencia),
las optimiza y las guarda en public/world/. Uso: python3 scripts/fetch-landmark-photos.py"""
import io, json, re, sys, time, urllib.error, urllib.parse, urllib.request
from PIL import Image

UA = {'User-Agent': 'ATLAS-travel-app/1.0 (offline landmark photos; open source)'}
OUT = 'public/world'
# id -> (artículo de Wikipedia en inglés, archivo concreto opcional)
# Artículos en español (mejor foto de portada); si falla, se usa el inglés.
ES = {
  'chichen': 'Chichén_Itzá', 'machu': 'Machu_Picchu', 'bigben': 'Big_Ben', 'eiffel': 'Torre_Eiffel',
  'belem': 'Torre_de_Belém', 'coliseo': 'Coliseo', 'piramides': 'Pirámide_de_Keops', 'burj': 'Burj_Khalifa',
  'muralla': 'Gran_Muralla_China', 'torii': 'Itsukushima-jinja', 'opera': 'Ópera_de_Sídney',
}
LANDMARKS = {
  'liberty': ('Statue_of_Liberty', None), 'chichen': ('Chichen_Itza', None), 'machu': ('Machu_Picchu', None),
  'cristo': ('Christ_the_Redeemer_(statue)', None), 'bigben': ('Big_Ben', None), 'eiffel': ('Eiffel_Tower', None),
  'sagrada': ('Sagrada_Família', None), 'belem': ('Belém_Tower', None), 'coliseo': ('Colosseum', 'Colosseo_2020.jpg'),
  'brandenburgo': ('Brandenburg_Gate', None), 'partenon': ('Parthenon', None), 'basilio': ("Saint_Basil's_Cathedral", None),
  'piramides': ('Giza_pyramid_complex', None), 'burj': ('Burj_Khalifa', None), 'taj': ('Taj_Mahal', None),
  'muralla': ('Great_Wall_of_China', None), 'torii': ('Itsukushima_Shrine', None), 'opera': ('Sydney_Opera_House', None),
}
only = set(sys.argv[1:])

def get(url, tries=6):
    # Wikimedia limita la frecuencia: se respeta Retry-After con reintentos espaciados.
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=40) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code != 429 or i == tries - 1:
                raise
            wait = int(e.headers.get('Retry-After') or 0) or 15 * (i + 1)
            print(f'   429, esperando {wait}s…', flush=True)
            time.sleep(min(wait, 120))

def strip_html(s):
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', s or '')).strip()

credits = {}
try:
    credits = json.load(open(f'{OUT}/credits.json'))
except Exception:
    pass

for lid, (title, forced) in LANDMARKS.items():
    if only and lid not in only:
        continue
    if not only and lid in credits and __import__('os').path.exists(f'{OUT}/{lid}.jpg'):
        continue
    try:
        fname = forced
        if not fname:
            for host, t in (('es', ES.get(lid)), ('en', title)):
                if not t:
                    continue
                try:
                    j = json.loads(get(f'https://{host}.wikipedia.org/api/rest_v1/page/summary/{urllib.parse.quote(t)}'))
                except Exception:
                    continue
                src = (j.get('originalimage') or {}).get('source', '')
                parts = src.split('?')[0].split('/')
                cand = urllib.parse.unquote(parts[-2] if '/thumb/' in src else parts[-1]) if src else ''
                if cand and not re.search(r'logo|map|mapa|locator|\.svg|\.png$', cand, re.I):
                    fname = cand
                    break
        if not fname:
            raise RuntimeError('sin foto adecuada')
        q = urllib.parse.urlencode({'action': 'query', 'titles': f'File:{fname}', 'prop': 'imageinfo',
                                    'iiprop': 'url|extmetadata', 'iiurlwidth': 960, 'format': 'json'})
        info = json.loads(get(f'https://commons.wikimedia.org/w/api.php?{q}'))
        page = next(iter(info['query']['pages'].values()))
        if 'imageinfo' not in page:
            info = json.loads(get(f'https://en.wikipedia.org/w/api.php?{q}'))
            page = next(iter(info['query']['pages'].values()))
        ii = page['imageinfo'][0]
        meta = ii.get('extmetadata', {})
        img = Image.open(io.BytesIO(get(ii.get('thumburl') or ii['url']))).convert('RGB')
        w = 900
        if img.width > w:
            img = img.resize((w, round(img.height * w / img.width)), Image.LANCZOS)
        img.save(f'{OUT}/{lid}.jpg', 'JPEG', quality=78, optimize=True, progressive=True)
        credits[lid] = {
            'file': fname,
            'author': strip_html(meta.get('Artist', {}).get('value', 'Desconocido'))[:120],
            'license': strip_html(meta.get('LicenseShortName', {}).get('value', '')),
            'source': ii.get('descriptionurl', ''),
            'w': img.width, 'h': img.height,
        }
        print('OK ', lid, fname, '·', credits[lid]['license'], '·', credits[lid]['author'][:40])
        time.sleep(4)
    except Exception as e:
        print('ERR', lid, title, e)
json.dump(credits, open(f'{OUT}/credits.json', 'w'), ensure_ascii=False, indent=1)
