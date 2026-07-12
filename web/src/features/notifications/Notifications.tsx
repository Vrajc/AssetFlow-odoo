import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Bell as BellIcon } from 'lucide-react';
import { useNotifications, useNotificationMutations, useActivity } from '../../api/hooks';
import { useAuth, isManager, roleLabel } from '../../stores/auth';
import { Card, Button, PageHeader, EmptyState } from '../../components/ui';
import { ago } from '../../lib/format';

const TABS = ['All', 'Alerts', 'Approvals', 'Bookings'] as const;

const TAB_FILTER: Record<string, (t: string) => boolean> = {
  All: () => true,
  Alerts: (t) => ['OVERDUE_RETURN', 'AUDIT_DISCREPANCY', 'BOOKING_REMINDER'].includes(t),
  Approvals: (t) => ['TRANSFER_UPDATE', 'MAINTENANCE_UPDATE'].includes(t),
  Bookings: (t) => ['BOOKING_UPDATE', 'BOOKING_REMINDER'].includes(t),
};

export default function Notifications() {
  const { user } = useAuth();
  const { data } = useNotifications();
  const m = useNotificationMutations();
  const [tab, setTab] = useState<(typeof TABS)[number]>('All');
  const { data: activity } = useActivity();

  const items = (data?.items ?? []).filter((n) => TAB_FILTER[tab](n.type));

  return (
    <div>
      <PageHeader title="Activity & Notifications" subtitle="Stay informed without digging for updates."
        actions={<Button variant="outline" onClick={() => m.markAll.mutate()}><CheckCheck size={16} /> Mark all read</Button>} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Notifications */}
        <Card className="overflow-hidden">
          <div className="flex gap-1 border-b border-border p-2">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? 'bg-primary/15 text-primary font-medium' : 'text-txt-muted hover:text-txt'}`}>{t}</button>
            ))}
          </div>
          <div className="divide-y divide-border">
            <AnimatePresence initial={false}>
              {items.map((n) => (
                <motion.div key={n.id} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                  onClick={() => !n.read && m.markRead.mutate(n.id)}
                  className={`flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-white/[0.02] ${!n.read ? 'bg-primary/[0.04]' : ''}`}>
                  <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 text-txt-muted"><Bell size={15} /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{n.title}</p>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    </div>
                    <p className="text-sm text-txt-muted">{n.body}</p>
                    {n.link && <Link to={n.link} className="text-xs text-primary hover:underline">View →</Link>}
                  </div>
                  <span className="shrink-0 text-xs text-txt-muted">{ago(n.createdAt)}</span>
                </motion.div>
              ))}
            </AnimatePresence>
            {!items.length && <EmptyState icon={<BellIcon size={26} />} title="You’re all caught up" />}
          </div>
        </Card>

        {/* Activity log (managers) */}
        {isManager(user?.role) || user?.role === 'DEPARTMENT_HEAD' ? (
          <Card className="overflow-hidden">
            <div className="border-b border-border p-4"><h3 className="font-medium">Activity log</h3><p className="text-xs text-txt-muted">Who did what, when.</p></div>
            <div className="max-h-[560px] divide-y divide-border overflow-y-auto">
              {activity?.map((a: any) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-[10px] text-txt-muted">{a.action}</span>
                    <span className="text-txt-muted">{a.actor?.name ?? 'System'} {a.actor && <span className="text-[10px]">({roleLabel(a.actor.role)})</span>}</span>
                  </div>
                  <span className="text-xs text-txt-muted">{ago(a.createdAt)}</span>
                </div>
              ))}
              {!activity?.length && <EmptyState title="No activity yet" />}
            </div>
          </Card>
        ) : (
          <Card className="p-5"><EmptyState title="Activity log" hint="Full audit logs are visible to managers and department heads." /></Card>
        )}
      </div>
    </div>
  );
}
