import {
  BedDouble, CalendarCheck, Landmark, MapPin, Mountain, ShoppingBag, Shapes, Sparkles, StickyNote, Ticket,
  TrainFront, UtensilsCrossed, Plane, Car, Bus, Ship, Coffee, Wine, Camera, Music, Gift, Heart, Briefcase,
  Fuel, Snowflake, Umbrella, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning, type LucideIcon,
} from 'lucide-react';

/** Iconos referenciables por nombre (para categorías guardadas en datos). */
export const ICONS: Record<string, LucideIcon> = {
  BedDouble, CalendarCheck, Landmark, MapPin, Mountain, ShoppingBag, Shapes, Sparkles, StickyNote, Ticket,
  TrainFront, UtensilsCrossed, Plane, Car, Bus, Ship, Coffee, Wine, Camera, Music, Gift, Heart, Briefcase,
  Fuel, Snowflake, Umbrella, Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow, CloudLightning,
};
export const ICON_CHOICES = Object.keys(ICONS);

export function Icon({ name, size }: { name: string; size?: number }) {
  const C = ICONS[name] ?? Shapes;
  return <C size={size} aria-hidden="true" />;
}
