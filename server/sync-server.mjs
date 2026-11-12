#!/usr/bin/env node
/**
 * Servidor de sincronización de referencia para ATLAS. Sin dependencias (Node 18+).
 * Guarda los cambios de cada "espacio" en ./server/data/<espacio>.json (último cambio por registro).
 *
 *   ATLAS_SYNC_TOKEN=una-clave-larga PORT=8787 node server/sync-server.mjs
 *
 * Seguridad: usa HTTPS (p. ej. detrás de Caddy o Tailscale) y una clave larga y aleatoria.
 */
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.ATLAS_SYNC_TOKEN;
const PORT = Number(process.env.PORT || 8787);
const DATA = process.env.ATLAS_DATA_DIR || join(dirname(fileURLToPath(import.meta.url)), 'data');
const MAX_BODY = 60 * 1024 * 1024;
if (!TOKEN || TOKEN.length < 12) {
  console.error('Define ATLAS_SYNC_TOKEN con al menos 12 caracteres.');
  process.exit(1);
}
mkdirSync(DATA, { recursive: true });

const spaces = new Map();
function load(space) {
  if (spaces.has(space)) return spaces.get(space);
  const file = join(DATA, `${space}.json`);
  const s = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { seq: 0, records: {} };
  spaces.set(space, s);
  return s;
}
function persist(space) {
  const file = join(DATA, `${space}.json`);
  writeFileSync(file + '.tmp', JSON.stringify(spaces.get(space)));
  renameSync(file + '.tmp', file);
}

function send(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Cache-Control': 'no-store',
  });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

const ENTITIES = new Set(['trips', 'participants', 'items', 'places', 'categories', 'expenses', 'settlements', 'docs', 'files', 'packingLists', 'packingItems', 'tasks', 'journal']);

createServer((req, res) => {
  if (req.method === 'OPTIONS') return send(res, 204);
  const url = new URL(req.url, 'http://x');
  if (url.pathname === '/api/health') return send(res, 200, { ok: true });
  const m = url.pathname.match(/^\/api\/spaces\/([a-z0-9-]{3,64})\/changes$/);
  if (!m) return send(res, 404, { error: 'not found' });
  if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(res, 401, { error: 'unauthorized' });
  const space = m[1];
  const s = load(space);

  if (req.method === 'GET') {
    const since = Number(url.searchParams.get('since') || 0);
    const limit = Math.min(Number(url.searchParams.get('limit') || 300), 1000);
    const all = Object.values(s.records).filter((c) => c.seq > since).sort((a, b) => a.seq - b.seq);
    const page = all.slice(0, limit);
    return send(res, 200, { changes: page, cursor: page.length ? page[page.length - 1].seq : Math.max(since, 0), more: all.length > limit });
  }
  if (req.method === 'POST') {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) {
        send(res, 413, { error: 'too large' });
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      if (res.writableEnded) return;
      let body;
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      } catch {
        return send(res, 400, { error: 'bad json' });
      }
      const { deviceId, changes } = body ?? {};
      if (typeof deviceId !== 'string' || !Array.isArray(changes)) return send(res, 400, { error: 'bad body' });
      let accepted = 0;
      for (const c of changes) {
        if (!c || !ENTITIES.has(c.entity) || typeof c.id !== 'string' || typeof c.updatedAt !== 'number') continue;
        const key = `${c.entity}:${c.id}`;
        const prev = s.records[key];
        if (prev && prev.updatedAt > c.updatedAt) continue; // última escritura gana
        s.records[key] = { ...c, deviceId, seq: ++s.seq };
        accepted++;
      }
      persist(space);
      send(res, 200, { accepted, cursor: s.seq });
    });
    return;
  }
  send(res, 405, { error: 'method not allowed' });
}).listen(PORT, () => console.log(`ATLAS sync escuchando en http://localhost:${PORT}`));
