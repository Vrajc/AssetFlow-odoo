import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ScanLine, Bell, LogOut, Command, Menu } from 'lucide-react';
import { useAuth, roleLabel } from '../stores/auth';
import { useUI } from '../stores/ui';
import { visibleNav } from '../lib/nav';
import { useNotifications } from '../api/hooks';

function Logo() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2 px-2">
      <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-bg font-display font-bold">A</div>
      <span className="font-display text-lg font-bold tracking-tight">AssetFlow</span>
    </Link>
  );
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { setPalette, setScanner } = useUI();
  const nav = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: notif } = useNotifications();
  const items = visibleNav(user?.role);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Sidebar */}
      <aside className={`${mobileOpen ? 'flex' : 'hidden'} lg:flex w-64 shrink-0 flex-col border-r border-border bg-surface fixed lg:static inset-y-0 z-40`}>
        <div className="flex h-16 items-center border-b border-border px-3"><Logo /></div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-primary/15 text-primary font-medium' : 'text-txt-muted hover:bg-white/5 hover:text-txt'}`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <div className="grid h-9 w-9 place-items-center rounded-full bg-elevated font-display text-sm font-semibold text-primary">
              {user?.name?.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-txt-muted">{roleLabel(user?.role)}</p>
            </div>
            <button onClick={() => { logout(); nav('/login'); }} className="text-txt-muted hover:text-danger" title="Log out">
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur">
          <button className="lg:hidden text-txt-muted" onClick={() => setMobileOpen((v) => !v)}><Menu size={20} /></button>
          <button
            onClick={() => setPalette(true)}
            className="flex flex-1 max-w-md items-center gap-2 rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-txt-muted hover:border-white/20"
          >
            <Search size={15} />
            <span className="flex-1 text-left">Search or jump to…</span>
            <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-border px-1.5 py-0.5 text-[10px]"><Command size={10} />K</kbd>
          </button>
          <div className="ml-auto flex items-center gap-1.5">
            <button onClick={() => setScanner(true)} className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-bg hover:bg-primary-hover">
              <ScanLine size={16} /> <span className="hidden sm:inline">Scan</span>
            </button>
            <Link to="/notifications" className="relative rounded-lg p-2 text-txt-muted hover:bg-white/5 hover:text-txt">
              <Bell size={19} />
              {!!notif?.unread && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white"
                >
                  {notif.unread}
                </motion.span>
              )}
            </Link>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
