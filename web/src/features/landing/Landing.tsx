import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, ShieldCheck, Zap, QrCode, CalendarClock, Wrench, ClipboardCheck,
  Boxes, ArrowLeftRight, Radio, Command, LayoutDashboard, CheckCircle2, Building2,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../stores/auth';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

function Reveal({ children, i = 0, className = '' }: { children: React.ReactNode; i?: number; className?: string }) {
  return (
    <motion.div variants={fadeUp} custom={i} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }} className={className}>
      {children}
    </motion.div>
  );
}

const FEATURES = [
  { icon: Boxes, title: 'Full asset lifecycle', body: 'Available → Allocated → Reserved → Under Maintenance → Lost → Retired → Disposed, enforced by a server-side state machine.', color: '#10B981' },
  { icon: ArrowLeftRight, title: 'Conflict-safe allocation', body: 'You can’t allocate an asset that’s already held. The system blocks it, names the holder, and opens a transfer request instead.', color: '#60A5FA' },
  { icon: CalendarClock, title: 'Overlap-free booking', body: 'Two people can’t book the same room at overlapping times — back-to-back slots are fine, clashes are rejected instantly.', color: '#A78BFA' },
  { icon: Wrench, title: 'Approval-driven maintenance', body: 'A drag-and-drop Kanban routes every repair through approval before the asset ever flips to Under Maintenance.', color: '#FBBF24' },
  { icon: ClipboardCheck, title: 'Structured audit cycles', body: 'Assign auditors, verify each asset, auto-generate discrepancy reports, and close cycles with real consequences.', color: '#F472B6' },
  { icon: Radio, title: 'Realtime everything', body: 'Socket.IO pushes KPIs, kanban moves, bookings and notifications live — two windows stay in perfect sync.', color: '#34D399' },
];

const STATS = [
  { k: '10', v: 'ERP modules' },
  { k: '7', v: 'Lifecycle states' },
  { k: '4', v: 'Role workflows' },
  { k: '<1s', v: 'Realtime sync' },
];

export default function Landing() {
  const nav = useNavigate();
  const { token } = useAuth();
  const cta = token ? '/dashboard' : '/login';
  const ctaLabel = token ? 'Open dashboard' : 'Launch the app';

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-bg text-txt">
      {/* Animated backdrop */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="aurora" />
        <div className="absolute inset-0 opacity-[0.4]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-30 border-b border-border/60 bg-bg/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-bg font-display font-bold">A</div>
            <span className="font-display text-lg font-bold">AssetFlow</span>
          </div>
          <div className="flex items-center gap-2">
            {token ? (
              <Link to="/dashboard" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-primary-hover">Open dashboard <ArrowRight size={15} /></Link>
            ) : (
              <>
                <Link to="/login" className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-txt transition-colors hover:bg-white/5">Log in</Link>
                <Link to="/login?signup=1" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-bg transition-colors hover:bg-primary-hover">Sign up <ArrowRight size={15} /></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 pt-20 pb-16 text-center sm:pt-28">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-primary">
            <Sparkles size={13} /> Enterprise Asset & Resource Management
          </span>
          <h1 className="mx-auto mt-6 max-w-4xl font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
            Track, allocate & maintain<br />
            <span className="bg-gradient-to-r from-primary via-emerald-300 to-info bg-clip-text text-transparent">every asset in real time.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-txt-muted sm:text-lg">
            AssetFlow replaces spreadsheets and paper logs with a centralized ERP — structured lifecycles,
            conflict-safe allocation, overlap-free booking, approval-driven maintenance, and audit cycles.
            For offices, schools, hospitals, factories — any organization with stuff to manage.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link to={cta} className="group flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-bg shadow-glow transition-transform hover:scale-[1.03]">
              {ctaLabel} <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
            </Link>
            <button onClick={() => nav('/login')} className="flex items-center gap-2 rounded-xl border border-border bg-surface/60 px-6 py-3.5 font-medium backdrop-blur transition-colors hover:bg-white/5">
              <Zap size={17} className="text-primary" /> Try a demo account
            </button>
          </div>
          <p className="mt-4 text-xs text-txt-muted">One-click demo logins on the sign-in screen · no setup required</p>
        </motion.div>

        {/* Floating app preview */}
        <motion.div initial={{ opacity: 0, y: 40, rotateX: 12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} transition={{ delay: 0.25, duration: 0.7 }}
          className="mx-auto mt-16 max-w-4xl" style={{ perspective: 1000 }}>
          <div className="rounded-2xl border border-border bg-surface/80 p-2 shadow-soft backdrop-blur-xl">
            <div className="rounded-xl border border-border bg-bg/80 p-5">
              {/* mini KPI row */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[{ n: '128', l: 'Available', c: '#10B981' }, { n: '76', l: 'Allocated', c: '#60A5FA' }, { n: '3', l: 'Overdue', c: '#F87171' }, { n: '12', l: 'Bookings', c: '#A78BFA' }].map((k, i) => (
                  <motion.div key={k.l} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.1 }}
                    className="rounded-xl border border-border bg-surface p-3 text-left">
                    <p className="font-display text-2xl font-bold" style={{ color: k.c }}>{k.n}</p>
                    <p className="text-[11px] text-txt-muted">{k.l}</p>
                  </motion.div>
                ))}
              </div>
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-left text-xs text-danger">
                <ShieldCheck size={14} /> Already allocated to Priya Shah (Engineering) — direct re-allocation is blocked.
              </div>
              <div className="mt-3 grid grid-cols-5 gap-2">
                {['Pending', 'Approved', 'Tech', 'In progress', 'Resolved'].map((c, i) => (
                  <div key={c} className="rounded-lg border border-border bg-surface p-2">
                    <p className="mb-1 text-[9px] uppercase tracking-wide text-txt-muted">{c}</p>
                    <div className="h-8 rounded-md" style={{ background: ['#FBBF2422', '#60A5FA22', '#A78BFA22', '#34D39922', '#10B98122'][i] }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="relative z-10 border-y border-border/60 bg-surface/40 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-5 py-10 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.v} i={i} className="text-center">
              <p className="font-display text-4xl font-bold text-primary">{s.k}</p>
              <p className="mt-1 text-sm text-txt-muted">{s.v}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Features bento */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Everything an operations team needs</h2>
          <p className="mt-3 text-txt-muted">Ten modules, one clean architecture. Role-based, realtime, and ruthlessly consistent.</p>
        </Reveal>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} i={i}>
              <div className="group h-full rounded-2xl border border-border bg-surface/60 p-6 backdrop-blur transition-all hover:-translate-y-1 hover:border-white/20 hover:shadow-soft">
                <div className="grid h-11 w-11 place-items-center rounded-xl transition-transform group-hover:scale-110" style={{ background: `${f.color}1f`, color: f.color }}>
                  <f.icon size={22} />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-txt-muted">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Signature rules */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-10">
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 to-transparent p-8">
              <QrCode className="text-primary" size={30} />
              <h3 className="mt-4 font-display text-2xl font-bold">Scan-to-verify audits</h3>
              <p className="mt-2 max-w-md text-txt-muted">Every asset carries a printable QR label. Auditors walk the floor, scan with a phone, and mark Verified / Missing / Damaged in one tap. Missing → Lost, Damaged → auto maintenance request.</p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-lg bg-bg/60 px-3 py-2 font-mono text-sm text-primary">assetflow://asset/AF-0114</div>
            </div>
          </Reveal>
          <Reveal i={1}>
            <div className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-info/10 to-transparent p-8">
              <Command className="text-info" size={30} />
              <h3 className="mt-4 font-display text-2xl font-bold">Built for speed</h3>
              <p className="mt-2 max-w-md text-txt-muted">A ⌘/Ctrl-K command palette jumps anywhere, searches assets by tag, and fires quick actions. Live notifications, KPI count-ups, animated kanban, and skeleton loaders throughout.</p>
              <div className="mt-6 flex flex-wrap gap-2">
                {['⌘K palette', 'Live KPIs', 'Drag & drop', 'Dark premium UI'].map((t) => (
                  <span key={t} className="rounded-lg border border-border bg-bg/60 px-3 py-1.5 text-xs text-txt-muted">{t}</span>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Roles */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <Reveal className="text-center">
          <h2 className="font-display text-3xl font-bold">Secure, role-based by design</h2>
          <p className="mt-3 text-txt-muted">Signup only ever creates an Employee. Roles are assigned by an admin — never self-elevated.</p>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Building2, role: 'Admin', desc: 'Org setup, role assignment, audit cycles, org-wide analytics.' },
            { icon: ShieldCheck, role: 'Asset Manager', desc: 'Register & allocate assets, approve transfers, maintenance & returns.' },
            { icon: LayoutDashboard, role: 'Department Head', desc: 'Approve department transfers, book resources on behalf of the team.' },
            { icon: CheckCircle2, role: 'Employee', desc: 'View held assets, book resources, raise maintenance & transfer requests.' },
          ].map((r, i) => (
            <Reveal key={r.role} i={i}>
              <div className="h-full rounded-2xl border border-border bg-surface/60 p-5 backdrop-blur">
                <r.icon className="text-primary" size={22} />
                <h3 className="mt-3 font-semibold">{r.role}</h3>
                <p className="mt-1.5 text-sm text-txt-muted">{r.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative z-10 mx-auto max-w-4xl px-5 py-20 text-center">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-b from-primary/15 to-surface/40 p-12">
            <div className="aurora opacity-60" />
            <div className="relative z-10">
              <h2 className="font-display text-3xl font-bold sm:text-4xl">See it live in 30 seconds</h2>
              <p className="mx-auto mt-3 max-w-xl text-txt-muted">Log in with a one-click demo account and try the double-allocation block, overlap booking, kanban, and scan-to-verify audits yourself.</p>
              <Link to={cta} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-bg shadow-glow transition-transform hover:scale-[1.03]">
                {ctaLabel} <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-txt-muted sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="grid h-6 w-6 place-items-center rounded-md bg-primary text-bg text-xs font-bold">A</div>
            AssetFlow — Enterprise Asset & Resource Management
          </div>
          <p>Built for the Odoo hackathon · no purchasing / invoicing / accounting by design</p>
        </div>
      </footer>
    </div>
  );
}
