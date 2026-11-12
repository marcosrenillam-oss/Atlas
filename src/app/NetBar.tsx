import { WifiOff } from 'lucide-react';
import { useOnline } from './hooks';

/** Aviso discreto y persistente cuando no hay conexión. Todo sigue funcionando en local. */
export function NetBar() {
  const online = useOnline();
  if (online) return null;
  return (
    <div className="netbar" role="status">
      <WifiOff aria-hidden="true" /> Sin conexión · tus cambios se guardan en el dispositivo
    </div>
  );
}
