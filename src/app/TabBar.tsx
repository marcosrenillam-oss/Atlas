import { NavLink, useLocation } from 'react-router-dom';
import { Compass, Home, Luggage, UserRound, Wallet } from 'lucide-react';
import { t } from '../i18n';

const TABS = [
  { to: '/', label: t('nav.home'), Icon: Home, end: true },
  { to: '/viajes', label: t('nav.trips'), Icon: Luggage, end: false },
  { to: '/explorar', label: t('nav.explore'), Icon: Compass, end: false },
  { to: '/gastos', label: t('nav.expenses'), Icon: Wallet, end: false },
  { to: '/perfil', label: t('nav.profile'), Icon: UserRound, end: false },
];

export function TabBar() {
  const { pathname } = useLocation();
  const idx = Math.max(0, TABS.findIndex((x) => (x.end ? pathname === x.to : pathname.startsWith(x.to))));
  return (
    <nav className="tabbar" aria-label="Navegación principal">
      <span className="tab-indicator" style={{ transform: `translateX(${idx * 100}%)` }} aria-hidden="true" />
      {TABS.map(({ to, label, Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon aria-hidden="true" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
