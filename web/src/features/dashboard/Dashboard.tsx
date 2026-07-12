import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Boxes, PackageCheck, Wrench, CalendarClock, ArrowLeftRight, RotateCcw,
  AlertTriangle, Plus, CalendarPlus, WrenchIcon, Activity,
} from 'lucide-react';
import { useKpis, useOverdue, useActivity } from '../../api/hooks';
import { useAuth, isManager } from '../../stores/auth';
import { Card, Skeleton, PageHeader } from '../../components/ui';
import { Annotation, Arrow } from '../../components/accents';
import { CountUp, ago } from '../../lib/format';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const CARDS = [
  { key: 'available', label: 'Assets Available', icon: Boxes, color: '#21B799' },
  { key: 'allocated', label: 'Assets Allocated', icon: PackageCheck, color: '#5B9BD5' },
  { key: 'maintenanceToday', label: 'Maintenance Today', icon: Wrench, color: '#E9A93D' },
  { key: 'activeBookings', label: 'Active Bookings', icon: CalendarClock, color: '#714B67' },
  { key: 'pendingTransfers', label: 'Pending Transfers', icon: ArrowLeftRight, color: '#21B799' },
  { key: 'upcomingReturns', label: 'Upcoming Returns', icon: RotateCcw, color: '#5B9BD5' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const { data: kpis, isLoading } = useKpis();
  const { data: overdue } = useOverdue();
  const { data: activity } = useActivity();

  return (
    <div>
      <PageHeader title={`${greeting()}, ${user?.name?.split(' ')[0] ?? ''}!`} subtitle={`Here’s your real-time snapshot for today.`} />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {CARDS.map((c, i) => (
          <motion.div key={c.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${c.color}1f`, color: c.color }}>
                  <c.icon size={18} />
                </div>
              </div>
              {isLoading ? <Skeleton className="h-8 w-14" /> : (
                <p className="font-display text-3xl font-bold" style={{ color: c.color }}>
                  <CountUp value={kpis?.[c.key] ?? 0} />
                </p>
              )}
              <p className="mt-1 text-xs text-txt-muted">{c.label}</p>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Overdue strip — distinct red, separate from upcoming */}
      {!!overdue?.length && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <Link to="/allocations?overdue=true"
            className="mt-4 flex items-center gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger hover:bg-danger/15">
            <AlertTriangle size={18} />
            <span className="font-medium">{overdue.length} asset{overdue.length > 1 ? 's' : ''} overdue for return</span>
            <span className="text-danger/80">— flagged for follow-up. Click to review →</span>
          </Link>
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {isManager(user?.role) && (
          <button onClick={() => nav('/assets?new=1')} className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-bg hover:bg-primary-hover">
            <Plus size={16} /> Register Asset
          </button>
        )}
        <button onClick={() => nav('/bookings')} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm hover:bg-black/[0.05]">
          <CalendarPlus size={16} /> Book Resource
        </button>
        <button onClick={() => nav('/maintenance?new=1')} className="flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2.5 text-sm hover:bg-black/[0.05]">
          <WrenchIcon size={16} /> Raise Maintenance Request
        </button>
      </div>

      {/* Recent activity — live feed */}
      <Card className="mt-6 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Activity size={18} className="text-primary" />
          <h2 className="font-display text-lg font-semibold">Recent Activity</h2>
          <span className="ml-2 flex items-center gap-1.5 text-xs text-txt-muted">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" /> live
          </span>
          <span className="ml-auto hidden items-center gap-1.5 sm:inline-flex">
            <Annotation text="updates live!" color="#E9A93D" className="leading-none" />
            <Arrow width={34} height={28} flip />
          </span>
        </div>
        <div className="divide-y divide-border">
          {(activity ?? []).slice(0, 12).map((a: any) => (
            <div key={a.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-black/[0.05] px-2 py-0.5 font-mono text-[11px] text-txt-muted">{a.action}</span>
                <span className="text-txt-muted">
                  {a.actor?.name ?? 'System'}
                  {a.metadata?.assetTag && <> · <span className="text-primary">{a.metadata.assetTag}</span></>}
                  {a.metadata?.to && <> → {a.metadata.to}</>}
                </span>
              </div>
              <span className="text-xs text-txt-muted">{ago(a.createdAt)}</span>
            </div>
          ))}
          {!activity?.length && <p className="py-6 text-center text-sm text-txt-muted">No recent activity.</p>}
        </div>
      </Card>
    </div>
  );
}
