import type { DayWeather } from '../services/weather';
import { describeWeather } from '../services/weather';
import { Icon } from './Icon';

export function WeatherChip({ w, compact }: { w: DayWeather; compact?: boolean }) {
  const d = describeWeather(w.code);
  return (
    <span className="weather-chip" title={d.label} aria-label={`${d.label}, máxima ${w.max} grados, mínima ${w.min}${w.rain !== null ? `, ${w.rain}% de lluvia` : ''}`}>
      <Icon name={d.icon} size={16} />
      <strong>{w.max}°</strong>
      <span className="faint">{w.min}°</span>
      {!compact && w.rain !== null && w.rain >= 20 && <span className="rain">{w.rain}%</span>}
    </span>
  );
}
