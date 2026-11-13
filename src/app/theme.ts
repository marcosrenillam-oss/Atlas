import type { ThemePref } from '../data/settings';

const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && mq().matches);
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  const color = dark ? '#0B0B0D' : '#F2F3F5';
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', color));
}

export function watchSystemTheme(getPref: () => ThemePref): () => void {
  const m = mq();
  const f = () => getPref() === 'system' && applyTheme('system');
  m.addEventListener('change', f);
  return () => m.removeEventListener('change', f);
}
