import { useEffect, useState } from 'react';

export const studioTimeZone = 'Europe/Berlin';
export function berlinDay(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en', { timeZone: studioTimeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(value).map(p => [p.type, p.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function useStudioClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); };
  }, []);
  const hour = Number(new Intl.DateTimeFormat('en', { timeZone: studioTimeZone, hour: 'numeric', hourCycle: 'h23' }).format(now));
  return {
    now,
    today: berlinDay(now),
    greeting: hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend',
    fullDate: new Intl.DateTimeFormat('de-DE', { timeZone: studioTimeZone, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(now),
    shortDate: new Intl.DateTimeFormat('de-DE', { timeZone: studioTimeZone, weekday: 'long', day: 'numeric', month: 'long' }).format(now),
  };
}
