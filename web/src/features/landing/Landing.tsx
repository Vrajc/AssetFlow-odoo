import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Check, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../stores/auth';
import { MODULES, ModuleIcon } from '../../components/ModuleIcon';
import { MarkerHighlight, Wavy, Arrow, Annotation, Sparkle, CircleScribble, SpeechBubble } from '../../components/accents';

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.07, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

function Reveal({ children, i = 0, className = '' }: { children: React.ReactNode; i?: number; className?: string }) {
  // Use mount-based `animate` (not whileInView): reliable under React StrictMode,
  // which otherwise leaves whileInView+once elements stuck at their hidden state.
  return (
    <motion.div variants={rise} custom={i} initial="hidden" animate="show" className={className}>
      {children}
    </motion.div>
  );
}

/** Soft curved arch divider between sections. */
function Arch({ fill = '#F4F2F8', flip = false }: { fill?: string; flip?: boolean }) {
  return (
    <div className="relative -mb-px leading-[0]" style={flip ? { transform: 'scaleY(-1)' } : undefined}>
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="h-12 w-full sm:h-20" aria-hidden>
        <path d="M0 80 C 360 0, 1080 0, 1440 80 Z" fill={fill} />
      </svg>
    </div>
  );
}

// Decorative mosaic shapes scattered behind the workflow tiles (Odoo-style texture).
const DECO = [
  { color: '#714B6722', size: 64, top: '8%', left: '3%', round: true },
  { color: '#21B79922', size: 48, top: '30%', left: '8%', round: false },
  { color: '#5B9BD522', size: 40, top: '70%', left: '4%', round: true },
  { color: '#E9A93D22', size: 56, top: '82%', left: '13%', round: false },
  { color: '#714B6722', size: 52, top: '10%', left: '92%', round: false },
  { color: '#E4585B22', size: 44, top: '38%', left: '95%', round: true },
  { color: '#21B79922', size: 60, top: '74%', left: '90%', round: false },
  { color: '#8F8F9F22', size: 40, top: '52%', left: '96%', round: true },
];

const WORKFLOW = [
  { c: '#714B67', t: 'Set up', d: 'Create departments, asset categories & the employee directory.' },
  { c: '#21B799', t: 'Register', d: 'Add assets with auto tags, QR codes & full lifecycle tracking.' },
  { c: '#5B9BD5', t: 'Allocate', d: 'Assign to people or teams — double-allocation is blocked automatically.' },
  { c: '#E9A93D', t: 'Book', d: 'Reserve rooms, vehicles & equipment by time slot with no overlaps.' },
  { c: '#E4585B', t: 'Maintain', d: 'Route every repair through an approval workflow before work starts.' },
  { c: '#714B67', t: 'Audit & report', d: 'Run audit cycles, catch discrepancies and surface live insights.' },
];

export default function Landing() {
  const { token } = useAuth();
  const primaryCta = token ? '/dashboard' : '/login?signup=1';
  const modules = MODULES.filter((m) => m.key !== 'dashboard');

  return (
    <div className="min-h-screen bg-bg text-txt">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 border-b border-border bg-bg/95">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-lg font-bold text-white">A</div>
            <span className="text-lg font-bold tracking-tight text-primary">AssetFlow</span>
          </Link>
          <div className="flex items-center gap-2">
            {token ? (
              <Link to="/dashboard" className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-primary-btn transition-colors hover:bg-primary-hover">Open dashboard <ArrowRight size={15} /></Link>
            ) : (
              <>
                <Link to="/login" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-txt transition-colors hover:bg-elevated">Login</Link>
                <Link to="/login?signup=1" className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-primary-btn transition-colors hover:bg-primary-hover">Sign up</Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pt-16 pb-10 text-center sm:pt-24">
        <div className="pointer-events-none absolute left-1/2 top-10 -z-0 h-72 w-72 -translate-x-1/2 rounded-full bg-tint opacity-60 blur-3xl" />
        <div className="relative mx-auto max-w-4xl">
          <motion.h1 initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-script text-5xl font-bold leading-[0.95] text-txt sm:text-7xl">
            All your assets on <MarkerHighlight>one platform</MarkerHighlight>.
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15, duration: 0.6 }}
            className="mx-auto mt-5 font-script text-2xl font-semibold text-txt-muted sm:text-3xl">
            Simple, efficient, yet <Wavy color="#5B9BD5">powerful</Wavy>!
          </motion.p>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25, duration: 0.6 }}
            className="mx-auto mt-5 max-w-xl text-base text-txt-muted">
            Track, allocate and maintain equipment, vehicles, furniture and shared spaces — for offices, schools, hospitals, factories. Any organization with things to manage.
          </motion.p>

          <div className="relative mt-16 inline-flex flex-col items-center">
            <div className="pointer-events-none absolute -top-16 right-2 hidden flex-col items-end lg:flex">
              <Annotation text="set up in minutes — for ANY org" />
              <Arrow className="mt-0.5 mr-8" width={44} height={38} />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to={primaryCta} className="group flex items-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-semibold text-white shadow-primary-btn transition-transform hover:scale-[1.03]">
                Start now – It’s free <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link to="/login" className="rounded-xl bg-elevated px-6 py-3.5 font-semibold text-txt transition-colors hover:bg-tint">View demo</Link>
            </div>
          </div>
        </div>
      </section>

      <Arch fill="#F4F2F8" />

      {/* Module grid */}
      <section id="modules" className="bg-bg-alt px-5 py-16">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-script text-4xl font-bold text-txt">One module for <CircleScribble color="#21B799">every job</CircleScribble></h2>
          <p className="mt-2 text-txt-muted">Set up departments, register assets, book resources, run maintenance and audits — all in one place.</p>
        </Reveal>
        <div className="mx-auto mt-10 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
          {modules.map((m, i) => (
            <Reveal key={m.key} i={i % 4}>
              <div className="group flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface p-5 text-center transition-all hover:-translate-y-1 hover:shadow-hover">
                <ModuleIcon icon={m.icon} color={m.color} tile={52} size={26} />
                <span className="text-sm font-medium">{m.label}</span>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="mt-8 text-center">
          <p className="font-script text-2xl font-semibold text-primary">Got assets to track? There’s a module for that.</p>
        </Reveal>
      </section>

      <Arch fill="#FFFFFF" />

      {/* Feature spotlights */}
      <section id="features" className="px-5 py-16">
        <div className="mx-auto max-w-6xl space-y-20">
          <Spotlight
            i={0}
            title={<>No more <MarkerHighlight>double-allocations</MarkerHighlight></>}
            body="When an asset is already held, AssetFlow blocks a second allocation, tells you exactly who has it, and opens a transfer request instead. Clean chain of custody, every time."
            visual={<ConflictMock />}
          />
          <Spotlight
            i={1}
            reverse
            title={<>Book resources, <Wavy color="#21B799">zero clashes</Wavy></>}
            body="Rooms, vehicles and shared equipment book by time slot with automatic overlap validation. Back-to-back is fine; a real clash is rejected on the spot."
            visual={<CalendarMock />}
          />
          <Spotlight
            i={2}
            title={<>Repairs that <MarkerHighlight color="#21B799">flow</MarkerHighlight></>}
            body="Every repair moves through a visual approval board — Pending, Approved, Technician, In Progress, Resolved — and the asset status updates itself along the way."
            visual={<KanbanMock />}
          />
        </div>
      </section>

      <Arch fill="#F4F2F8" />

      {/* How it works — mosaic of colourful workflow tiles */}
      <section className="relative overflow-hidden bg-bg-alt px-5 py-16">
        {/* Decorative scattered shapes (mosaic texture) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden lg:block">
          {DECO.map((d, i) => (
            <span key={i} className={`absolute ${d.round ? 'rounded-full' : 'rounded-2xl'}`} style={{ background: d.color, width: d.size, height: d.size, top: d.top, left: d.left }} />
          ))}
        </div>

        <Reveal className="relative mx-auto max-w-2xl text-center">
          <div className="flex items-center justify-center gap-3">
            <h2 className="font-script text-4xl font-bold text-txt sm:text-5xl">How AssetFlow works</h2>
            <SpeechBubble text="easy!" color="#E9A93D" className="hidden -rotate-6 sm:inline-flex" />
          </div>
          <p className="mt-2 text-txt-muted">Six simple steps — from setup to insight. Each colour is a stage in the journey.</p>
        </Reveal>

        <div className="relative mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {WORKFLOW.map((s, i) => {
            const solid = i % 2 === 0;
            // varied Odoo-style organic corners
            const shape = ['rounded-[28px] rounded-tr-[64px]', 'rounded-[28px] rounded-bl-[64px]', 'rounded-[28px] rounded-tl-[64px]'][i % 3];
            return (
              <Reveal key={s.t} i={i % 3}>
                <div className={`flex h-full flex-col gap-2.5 p-6 transition-transform hover:-translate-y-1 ${shape}`}
                  style={{ background: solid ? s.c : `${s.c}24`, color: solid ? '#FFFFFF' : '#1F2937' }}>
                  <div className={`grid h-11 w-11 place-items-center rounded-full text-lg font-bold ${solid ? 'bg-white/25 text-white' : 'text-white'}`} style={solid ? undefined : { background: s.c }}>{i + 1}</div>
                  <p className="text-lg font-bold">{s.t}</p>
                  <p className={`text-sm ${solid ? 'text-white/85' : 'text-txt-muted'}`}>{s.d}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
        <Reveal className="relative mt-8 text-center">
          <p className="font-script text-2xl font-semibold text-primary">Role-based, real-time, and ready for any organization.</p>
        </Reveal>
      </section>

      <Arch fill="#FFFFFF" />

      {/* Final CTA */}
      <section className="px-5 pb-20">
        <Reveal className="mx-auto max-w-4xl">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-tint px-6 py-14 text-center">
            <Sparkle className="absolute left-10 top-8" color="#714B67" />
            <Sparkle className="absolute right-12 bottom-10" size={28} />
            <h2 className="font-script text-4xl font-bold text-txt sm:text-6xl">Unleash your organization’s potential</h2>
            <p className="mx-auto mt-3 max-w-lg text-txt-muted">Log in with a one-click demo account and see the whole thing running in under a minute.</p>
            <Link to={primaryCta} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-white shadow-primary-btn transition-transform hover:scale-[1.03]">
              Start now – It’s free <ArrowRight size={18} />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-bg-alt py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 text-center">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-sm font-bold text-white">A</div>
            <span className="font-bold text-primary">AssetFlow</span>
          </div>
          <p className="max-w-md text-sm text-txt-muted">Enterprise asset & resource management — track, allocate and maintain everything your organization owns.</p>
        </div>
        <p className="mx-auto mt-6 max-w-6xl px-5 text-center text-xs text-txt-muted">© {new Date().getFullYear()} AssetFlow · Built for the Odoo hackathon · Odoo-inspired, not affiliated.</p>
      </footer>
    </div>
  );
}

/* ------------------------------- Spotlight -------------------------------- */
function Spotlight({ title, body, visual, reverse, i }: { title: React.ReactNode; body: string; visual: React.ReactNode; reverse?: boolean; i: number }) {
  return (
    <Reveal i={i}>
      <div className={`grid items-center gap-10 lg:grid-cols-2 ${reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}>
        <div>
          <h3 className="font-script text-4xl font-bold leading-tight text-txt">{title}</h3>
          <p className="mt-4 max-w-md text-txt-muted">{body}</p>
          <Link to="/login" className="mt-5 inline-flex items-center gap-1.5 font-semibold text-primary hover:underline">See it in action <ArrowRight size={16} /></Link>
        </div>
        <div className="flex justify-center">{visual}</div>
      </div>
    </Reveal>
  );
}

/* ------------------------- In-app mock visuals ---------------------------- */
function MockCard({ children, rotate = 0, className = '' }: { children: React.ReactNode; rotate?: number; className?: string }) {
  return (
    <div className={`w-full max-w-sm rounded-2xl border border-border bg-surface p-4 shadow-hover ${className}`} style={{ transform: `rotate(${rotate}deg)` }}>
      {children}
    </div>
  );
}

function ConflictMock() {
  return (
    <MockCard rotate={-2}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-txt-muted">Allocate asset</p>
      <div className="rounded-lg border border-border bg-bg-alt px-3 py-2 text-sm font-mono">AF-0114 · Dell Laptop</div>
      <div className="mt-3 rounded-lg border p-3 text-sm" style={{ borderColor: '#E4585B66', background: '#E4585B14', color: '#E4585B' }}>
        <div className="flex items-center gap-2 font-semibold"><AlertTriangle size={15} /> Already allocated to Priya Shah</div>
        <p className="mt-1 opacity-90">Direct re-allocation is blocked — submit a transfer request.</p>
      </div>
      <div className="mt-3 rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-white">Submit a Transfer Request</div>
    </MockCard>
  );
}

function CalendarMock() {
  return (
    <MockCard rotate={2}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-txt-muted">Conference Room B2</p>
      <div className="space-y-1.5 text-xs">
        <div className="rounded-md px-2 py-2" style={{ background: '#5B9BD522', color: '#3f7bb0' }}>9:00–10:00 · Booked (Procurement)</div>
        <div className="rounded-md border border-dashed px-2 py-2" style={{ borderColor: '#E4585B', background: '#E4585B14', color: '#E4585B' }}>9:30–10:30 · conflict — slot unavailable</div>
        <div className="rounded-md px-2 py-2" style={{ background: '#21B79922', color: '#188f76' }}>10:00–11:00 · free ✓</div>
      </div>
    </MockCard>
  );
}

function KanbanMock() {
  const cols = [
    { t: 'Pending', c: '#E9A93D' },
    { t: 'Approved', c: '#5B9BD5' },
    { t: 'Resolved', c: '#21B799' },
  ];
  return (
    <MockCard rotate={-1} className="max-w-md">
      <div className="grid grid-cols-3 gap-2">
        {cols.map((col) => (
          <div key={col.t} className="rounded-lg bg-bg-alt p-2">
            <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase text-txt-muted">
              <span className="h-2 w-2 rounded-full" style={{ background: col.c }} /> {col.t}
            </div>
            <div className="rounded-md border border-border bg-surface p-2 text-[10px]">
              <span className="font-mono text-primary">AF-00{col.t === 'Resolved' ? '87' : '62'}</span>
              <p className="mt-0.5 text-txt-muted">{col.t === 'Resolved' ? <span className="inline-flex items-center gap-1 text-[#21B799]"><Check size={10} /> done</span> : 'issue…'}</p>
            </div>
          </div>
        ))}
      </div>
    </MockCard>
  );
}
