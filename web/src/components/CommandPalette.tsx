import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft } from 'lucide-react';
import { useUI } from '../stores/ui';
import { useAuth } from '../stores/auth';
import { visibleNav } from '../lib/nav';
import { api } from '../api/client';

interface Cmd { id: string; label: string; hint?: string; run: () => void; }

export function CommandPalette() {
  const { paletteOpen, setPalette, setScanner } = useUI();
  const nav = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState('');
  const [assetHits, setAssetHits] = useState<{ id: string; assetTag: string; name: string }[]>([]);

  useEffect(() => { if (!paletteOpen) { setQ(''); setAssetHits([]); } }, [paletteOpen]);

  useEffect(() => {
    if (!paletteOpen || q.length < 2) { setAssetHits([]); return; }
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get(`/assets?q=${encodeURIComponent(q)}&pageSize=5`);
        setAssetHits(data.items.map((a: any) => ({ id: a.assetTag, assetTag: a.assetTag, name: a.name })));
      } catch { /* ignore */ }
    }, 200);
    return () => clearTimeout(t);
  }, [q, paletteOpen]);

  const base: Cmd[] = useMemo(() => {
    const goto = visibleNav(user?.role).map((n) => ({ id: `nav-${n.to}`, label: `Go to ${n.label}`, hint: 'Navigate', run: () => nav(n.to) }));
    const actions: Cmd[] = [
      { id: 'a-register', label: 'Register asset', hint: 'Action', run: () => nav('/assets?new=1') },
      { id: 'a-book', label: 'Book a resource', hint: 'Action', run: () => nav('/bookings') },
      { id: 'a-raise', label: 'Raise maintenance request', hint: 'Action', run: () => nav('/maintenance?new=1') },
      { id: 'a-scan', label: 'Scan QR code', hint: 'Action', run: () => { setScanner(true); } },
    ];
    return [...actions, ...goto];
  }, [user, nav, setScanner]);

  const filtered = base.filter((c) => c.label.toLowerCase().includes(q.toLowerCase()));

  if (!paletteOpen) return null;

  const runCmd = (c: Cmd) => { setPalette(false); c.run(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-[#1F2937]/40" onClick={() => setPalette(false)} />
      <div className="glass relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-border shadow-soft">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search size={18} className="text-txt-muted" />
          <input
            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Search assets, jump to a screen, run an action…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-txt-muted"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (assetHits[0]) runCmd({ id: 'x', label: '', run: () => nav(`/assets/${assetHits[0].assetTag}`) });
                else if (filtered[0]) runCmd(filtered[0]);
              }
            }}
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-txt-muted">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {assetHits.length > 0 && (
            <>
              <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-txt-muted">Assets</p>
              {assetHits.map((a) => (
                <button key={a.id} onClick={() => runCmd({ id: a.id, label: '', run: () => nav(`/assets/${a.assetTag}`) })}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[0.05]">
                  <span><span className="font-mono text-primary">{a.assetTag}</span> · {a.name}</span>
                  <CornerDownLeft size={14} className="text-txt-muted" />
                </button>
              ))}
            </>
          )}
          <p className="px-2 py-1 text-[11px] uppercase tracking-wide text-txt-muted">Actions & navigation</p>
          {filtered.map((c) => (
            <button key={c.id} onClick={() => runCmd(c)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-black/[0.05]">
              <span>{c.label}</span>
              <span className="text-[11px] text-txt-muted">{c.hint}</span>
            </button>
          ))}
          {filtered.length === 0 && assetHits.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-txt-muted">No matches</p>
          )}
        </div>
      </div>
    </div>
  );
}
