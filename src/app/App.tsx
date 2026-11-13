import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { TabBar } from './TabBar';
import { applyTheme, watchSystemTheme } from './theme';
import { useProfile } from '../data/settings';
import { UIProvider, useUI } from '../ui/UIProvider';
import { destinationPhoto } from '../ui/Cover';
import { db } from '../data/db';
import { runOfflinePack } from './offlinePack';
import { HomePage } from '../features/home/HomePage';
import { TripsPage } from '../features/trips/TripsPage';
import { TripPage } from '../features/trip/TripPage';
import { ExplorePage } from '../features/explore/ExplorePage';
import { ExpensesPage } from '../features/expenses/ExpensesPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { PassportPage } from '../features/passport/PassportPage';

const WorldPage = lazy(() => import('../features/world/WorldPage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/**
 * Actualización automática: al abrir ATLAS (o volver a ella) se busca una versión nueva; si la hay,
 * se aplica sola en cuanto no haya ningún formulario abierto. Los datos viven en IndexedDB y no se tocan.
 */
function AutoUpdate() {
  const ui = useUI();
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      const check = () => navigator.onLine && reg.update().catch(() => {});
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && check());
      setInterval(check, 30 * 60_000);
    },
  });
  const shown = useRef(false);
  useEffect(() => {
    if (offlineReady && !shown.current) {
      shown.current = true;
      ui.toast('ATLAS ya funciona sin conexión.');
    }
  }, [offlineReady, ui]);
  useEffect(() => {
    if (!needRefresh) return;
    const apply = () => {
      // No interrumpir si hay una hoja/formulario abierto: se reintenta en unos segundos.
      if (document.querySelector('.sheet, .dialog, .viewer')) return false;
      try {
        sessionStorage.setItem('atlas-updated', '1');
      } catch {
        /* sin sessionStorage */
      }
      void updateServiceWorker(true);
      return true;
    };
    if (apply()) return;
    const id = setInterval(() => apply() && clearInterval(id), 2000);
    return () => clearInterval(id);
  }, [needRefresh, updateServiceWorker]);
  useEffect(() => {
    try {
      if (sessionStorage.getItem('atlas-updated')) {
        sessionStorage.removeItem('atlas-updated');
        ui.toast('ATLAS se ha actualizado a la última versión ✨');
      }
    } catch {
      /* sin sessionStorage */
    }
  }, [ui]);
  return null;
}

function Themer() {
  const profile = useProfile();
  const pref = useRef(profile.theme);
  pref.current = profile.theme;
  useEffect(() => {
    applyTheme(profile.theme);
  }, [profile.theme]);
  useEffect(() => watchSystemTheme(() => pref.current), []);
  return null;
}

/** Prepara la app para verse igual sin conexión: guarda en segundo plano las fotos (primero las de tus viajes). */
function OfflinePack() {
  useEffect(() => {
    const go = async () => {
      const trips = await db.trips.toArray().catch(() => []);
      const mine = trips.map((t) => destinationPhoto(t)).filter((x): x is string => !!x);
      await runOfflinePack(mine);
    };
    const t = setTimeout(() => void go(), 3500);
    window.addEventListener('online', go);
    return () => {
      clearTimeout(t);
      window.removeEventListener('online', go);
    };
  }, []);
  return null;
}

export function App() {
  return (
    <UIProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Themer />
        <AutoUpdate />
        <ScrollToTop />
        <OfflinePack />
        <div className="shell">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/viajes" element={<TripsPage />} />
            <Route path="/viajes/:tripId/:tab?" element={<TripPage />} />
            <Route path="/explorar" element={<ExplorePage />} />
            <Route path="/gastos" element={<ExpensesPage />} />
            <Route path="/perfil" element={<ProfilePage />} />
            <Route path="/pasaporte" element={<PassportPage />} />
            <Route path="/mundo" element={<Suspense fallback={<div className="world" />}><WorldPage /></Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <TabBar />
      </BrowserRouter>
    </UIProvider>
  );
}
