import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/app.css';
import './styles/aurora.css';
import './styles/routemind.css';
import { App } from './app/App';
import { ensureSeed } from './data/seed';
import { startSync } from './sync/engine';
import { getKV, DEFAULT_PROFILE, type Profile } from './data/settings';
import { applyTheme } from './app/theme';
import { setLanguage } from './i18n';

async function boot() {
  try {
    const profile = await getKV<Profile>('profile', DEFAULT_PROFILE);
    applyTheme(profile.theme);
    setLanguage(profile.language);
    await ensureSeed();
    await startSync();
  } catch (e) {
    console.error(e);
    const root = document.getElementById('root')!;
    root.innerHTML = `<div style="padding:40px 24px;font-family:-apple-system,system-ui;text-align:center">
      <h2>No se pudo abrir el almacenamiento local</h2>
      <p style="color:#666">Es posible que el navegador esté en modo privado o sin espacio. ATLAS necesita IndexedDB para guardar tus viajes.</p></div>`;
    return;
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
void boot();
