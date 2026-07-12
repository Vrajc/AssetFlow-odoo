import { useEffect, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

export function CountUp({ value, className = '' }: { value: number; className?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const from = 0;
    const dur = 700;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <span className={`tnum ${className}`}>{n}</span>;
}

export const fmtDate = (d?: string | null) => (d ? format(new Date(d), 'MMM d, yyyy') : '—');
export const fmtDateTime = (d?: string | null) => (d ? format(new Date(d), 'MMM d, HH:mm') : '—');
export const fmtTime = (d: string | Date) => format(new Date(d), 'HH:mm');
export const ago = (d?: string | null) => (d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : '');
export const fmtCurrency = (v?: string | number | null) =>
  v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`;
