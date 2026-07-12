import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, ClipboardCheck } from 'lucide-react';
import { useAuditCycles, useDepartments, useUsers, useAuditMutations } from '../../api/hooks';
import { useAuth } from '../../stores/auth';
import { Card, Button, Input, Select, Modal, Pill, PageHeader, EmptyState } from '../../components/ui';
import { fmtDate } from '../../lib/format';
import { apiError } from '../../api/client';

function Ring({ pct }: { pct: number }) {
  const r = 22, c = 2 * Math.PI * r;
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <circle cx="28" cy="28" r={r} fill="none" stroke="#10B981" strokeWidth="5" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (c * pct) / 100} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x="28" y="28" transform="rotate(90 28 28)" textAnchor="middle" dominantBaseline="central" className="fill-txt text-[11px] font-semibold">{pct}%</text>
    </svg>
  );
}

export default function Audits() {
  const { user } = useAuth();
  const { data: cycles } = useAuditCycles();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <PageHeader title="Asset Audit" subtitle="Run structured verification cycles with assigned auditors."
        actions={user?.role === 'ADMIN' && <Button onClick={() => setOpen(true)}><Plus size={16} /> New Audit Cycle</Button>} />

      <div className="grid gap-3 md:grid-cols-2">
        {cycles?.map((c) => (
          <Link key={c.id} to={`/audits/${c.id}`}>
            <Card className="flex items-center gap-4 p-5 hover:border-primary/40">
              <Ring pct={c.progress} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{c.name}</h3>
                  <Pill style={c.status === 'OPEN' ? { label: 'Open', dot: '#10B981', bg: '#10B98120', text: '#10B981' } : { label: 'Closed', dot: '#9CA3AF', bg: '#9CA3AF20', text: '#9CA3AF' }} />
                </div>
                <p className="mt-1 text-xs text-txt-muted">{fmtDate(c.startDate)} – {fmtDate(c.endDate)} · {c.done}/{c.total} verified</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {c.auditors?.map((a: any) => <span key={a.id} className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-txt-muted">{a.auditor.name}</span>)}
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
      {!cycles?.length && <EmptyState icon={<ClipboardCheck size={28} />} title="No audit cycles yet" hint="Create one to start verifying assets." />}

      {open && <CreateModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const { data: depts } = useDepartments();
  const { data: users } = useUsers();
  const m = useAuditMutations();
  const [form, setForm] = useState<any>({ name: '', scopeDepartmentId: '', scopeLocation: '', startDate: '', endDate: '' });
  const [auditorIds, setAuditorIds] = useState<string[]>([]);

  const submit = async () => {
    try {
      await m.create.mutateAsync({
        name: form.name, scopeDepartmentId: form.scopeDepartmentId || undefined, scopeLocation: form.scopeLocation || undefined,
        startDate: new Date(form.startDate).toISOString(), endDate: new Date(form.endDate).toISOString(), auditorIds,
      });
      toast.success('Audit cycle created'); onClose();
    } catch (e) { toast.error(apiError(e).message); }
  };

  return (
    <Modal open onClose={onClose} title="New audit cycle">
      <div className="space-y-3">
        <Input label="Cycle name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Q3 Audit: Engineering Dept" />
        <Select label="Scope: Department" value={form.scopeDepartmentId} onChange={(e) => setForm({ ...form, scopeDepartmentId: e.target.value })}>
          <option value="">— all departments —</option>
          {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Input label="Scope: Location (optional)" value={form.scopeLocation} onChange={(e) => setForm({ ...form, scopeLocation: e.target.value })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start date" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          <Input label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        </div>
        <div>
          <span className="mb-1.5 block text-xs font-medium text-txt-muted">Assign auditors</span>
          <div className="flex flex-wrap gap-1.5">
            {users?.map((u) => (
              <button key={u.id} onClick={() => setAuditorIds((prev) => prev.includes(u.id) ? prev.filter((x) => x !== u.id) : [...prev, u.id])}
                className={`rounded-full px-2.5 py-1 text-xs ${auditorIds.includes(u.id) ? 'bg-primary text-bg' : 'bg-white/5 text-txt-muted hover:text-txt'}`}>
                {u.name}
              </button>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={m.create.isPending} disabled={!form.name || !form.startDate || !form.endDate || !auditorIds.length}>Create cycle</Button></div>
      </div>
    </Modal>
  );
}
