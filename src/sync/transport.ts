import type { EntityName } from '../domain/types';

/** Cambio intercambiado con el servidor. data solo en op=put. */
export interface Change {
  entity: EntityName;
  id: string;
  op: 'put' | 'delete';
  updatedAt: number;
  tripId: string | null;
  data?: Record<string, unknown>;
  deviceId?: string;
  seq?: number;
}

export interface PullResult {
  changes: Change[];
  cursor: number;
  more: boolean;
}

/** Interfaz independiente del proveedor: cualquier backend que la cumpla sirve. */
export interface SyncTransport {
  check(): Promise<void>;
  push(deviceId: string, changes: Change[]): Promise<void>;
  pull(since: number): Promise<PullResult>;
}

export class SyncHttpError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
  }
}

/** Transporte HTTP para el servidor de referencia de ATLAS (server/sync-server.mjs). */
export function httpTransport(baseUrl: string, space: string, token: string): SyncTransport {
  const root = baseUrl.replace(/\/+$/, '');
  const url = (p: string) => `${root}/api/spaces/${encodeURIComponent(space)}${p}`;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  async function req<T>(input: string, init?: RequestInit): Promise<T> {
    let res: Response;
    try {
      res = await fetch(input, { ...init, headers, cache: 'no-store' });
    } catch {
      throw new SyncHttpError('No se pudo contactar con el servidor de sincronización.');
    }
    if (res.status === 401) throw new SyncHttpError('Clave de acceso incorrecta.', 401);
    if (!res.ok) throw new SyncHttpError(`El servidor respondió ${res.status}.`, res.status);
    return (await res.json()) as T;
  }
  return {
    async check() {
      await req(url('/changes?since=0&limit=1'));
    },
    async push(deviceId, changes) {
      await req(url('/changes'), { method: 'POST', body: JSON.stringify({ deviceId, changes }) });
    },
    pull(since) {
      return req<PullResult>(url(`/changes?since=${since}&limit=300`));
    },
  };
}
