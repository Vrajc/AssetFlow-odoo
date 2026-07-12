import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors, useDroppable, useDraggable, DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Plus, Wrench } from 'lucide-react';
import { useMaintenance, useAssets, useMaintenanceMutations } from '../../api/hooks';
import { useAuth, isManager } from '../../stores/auth';
import { Card, Button, Select, Textarea, Modal, Pill, PageHeader } from '../../components/ui';
import { MAINT_STATUS, PRIORITY } from '../../lib/status';
import { fileUrl, apiError } from '../../api/client';

const COLUMNS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'TECHNICIAN_ASSIGNED', label: 'Technician Assigned' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'RESOLVED', label: 'Resolved' },
];

// Which target columns are reachable from a given status (mirrors server workflow).
const NEXT: Record<string, string[]> = {
  PENDING: ['APPROVED'],
  APPROVED: ['TECHNICIAN_ASSIGNED'],
  TECHNICIAN_ASSIGNED: ['IN_PROGRESS'],
  IN_PROGRESS: ['RESOLVED'],
  RESOLVED: [],
};

export default function Maintenance() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const { data } = useMaintenance();
  const m = useMaintenanceMutations();
  const [raiseOpen, setRaiseOpen] = useState(params.get('new') === '1');
  const [active, setActive] = useState<any>(null);
  const [extra, setExtra] = useState<{ card: any; to: string } | null>(null);
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Touch: long-press ~200ms to start a drag, so a quick swipe still scrolls the board.
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  );

  useEffect(() => { if (params.get('new') === '1') { setRaiseOpen(true); params.delete('new'); setParams(params, { replace: true }); } }, []);

  const onStart = (e: DragStartEvent) => setActive(e.active.data.current?.card);
  const onEnd = (e: DragEndEvent) => {
    setActive(null);
    const card = e.active.data.current?.card;
    const to = e.over?.id as string | undefined;
    if (!card || !to || to === card.status) return;
    if (!NEXT[card.status]?.includes(to)) { toast.error(`Can’t move ${MAINT_STATUS[card.status].label} → ${MAINT_STATUS[to].label}`); return; }
    // Columns needing extra input open a modal; others move directly.
    if (to === 'TECHNICIAN_ASSIGNED' || to === 'RESOLVED') { setExtra({ card, to }); return; }
    m.move.mutate({ id: card.id, to }, { onSuccess: () => toast.success('Moved'), onError: (err) => toast.error(apiError(err).message) });
  };

  return (
    <div>
      <PageHeader title="Maintenance" subtitle="Route repairs through approval before work starts. Drag cards across the workflow."
        actions={<Button onClick={() => setRaiseOpen(true)}><Plus size={16} /> Raise Request</Button>} />

      {!isManager(user?.role) && <p className="mb-3 rounded-lg border border-border bg-black/[0.02] px-3 py-2 text-xs text-txt-muted">Drag actions are manager-only — you can still raise requests. Approving a card moves the asset to Under Maintenance; resolving it returns the asset to Available.</p>}

      <DndContext sensors={sensors} onDragStart={onStart} onDragEnd={onEnd}>
        <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {COLUMNS.map((col) => (
            <div key={col.key} className="w-[80vw] shrink-0 sm:w-72 lg:w-auto">
              <Column id={col.key} label={col.label} cards={data?.board?.[col.key] ?? []} draggable={isManager(user?.role)} />
            </div>
          ))}
        </div>
        <DragOverlay>{active && <CardBody card={active} dragging />}</DragOverlay>
      </DndContext>

      {raiseOpen && <RaiseModal onClose={() => setRaiseOpen(false)} />}
      {extra && <ExtraModal card={extra.card} to={extra.to} onClose={() => setExtra(null)} />}
    </div>
  );
}

function Column({ id, label, cards, draggable }: { id: string; label: string; cards: any[]; draggable: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`rounded-xl border p-2 transition-colors ${isOver ? 'border-primary/50 bg-primary/5' : 'border-border bg-surface'}`}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-medium">{label}</span>
        <span className="rounded-full bg-black/[0.05] px-2 text-xs text-txt-muted">{cards.length}</span>
      </div>
      <div className="min-h-[120px] space-y-2">
        {cards.map((c) => draggable ? <Draggable key={c.id} card={c} /> : <CardBody key={c.id} card={c} />)}
      </div>
    </div>
  );
}

function Draggable({ card }: { card: any }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id, data: { card } });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{ touchAction: 'none' }}
      className={`cursor-grab select-none active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
    >
      <CardBody card={card} />
    </div>
  );
}

function CardBody({ card, dragging }: { card: any; dragging?: boolean }) {
  return (
    <motion.div whileHover={{ y: -1 }} className={`rounded-lg border border-border bg-elevated p-3 text-sm ${dragging ? 'rotate-2 shadow-glow' : ''}`}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-primary">{card.asset.assetTag}</span>
        <Pill style={PRIORITY[card.priority]} />
      </div>
      <p className="mt-1.5 line-clamp-2 text-txt">{card.issue}</p>
      {card.photoUrl && <img src={fileUrl(card.photoUrl)} className="mt-2 h-16 w-full rounded object-cover" />}
      <div className="mt-2 flex items-center justify-between text-[11px] text-txt-muted">
        <span>{card.raisedBy?.name}</span>
        {card.technicianName && <span>🔧 {card.technicianName}</span>}
      </div>
    </motion.div>
  );
}

function RaiseModal({ onClose }: { onClose: () => void }) {
  const { data: assets } = useAssets({ pageSize: 200 });
  const m = useMaintenanceMutations();
  const [assetId, setAssetId] = useState('');
  const [issue, setIssue] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const submit = async () => {
    try { await m.raise.mutateAsync({ assetId, issue, priority }); toast.success('Request raised'); onClose(); }
    catch (e) { toast.error(apiError(e).message); }
  };
  return (
    <Modal open onClose={onClose} title="Raise maintenance request">
      <div className="space-y-3">
        <Select label="Asset" value={assetId} onChange={(e) => setAssetId(e.target.value)}>
          <option value="">— select —</option>
          {assets?.items.map((a) => <option key={a.id} value={a.id}>{a.assetTag} · {a.name}</option>)}
        </Select>
        <Textarea label="Describe the issue" rows={3} value={issue} onChange={(e) => setIssue(e.target.value)} />
        <Select label="Priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p} value={p}>{p}</option>)}
        </Select>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={m.raise.isPending} disabled={!assetId || issue.length < 3}>Submit</Button></div>
      </div>
    </Modal>
  );
}

function ExtraModal({ card, to, onClose }: { card: any; to: string; onClose: () => void }) {
  const m = useMaintenanceMutations();
  const [value, setValue] = useState('');
  const submit = async () => {
    try {
      await m.move.mutateAsync({ id: card.id, to, technicianName: to === 'TECHNICIAN_ASSIGNED' ? value : undefined, notes: to === 'RESOLVED' ? value : undefined });
      toast.success('Updated'); onClose();
    } catch (e) { toast.error(apiError(e).message); }
  };
  return (
    <Modal open onClose={onClose} title={to === 'TECHNICIAN_ASSIGNED' ? 'Assign technician' : 'Resolve request'}>
      <div className="space-y-3">
        {to === 'TECHNICIAN_ASSIGNED'
          ? <Select label="Technician" value={value} onChange={(e) => setValue(e.target.value)}><option value="">— select —</option>{['R. Verma', 'S. Menon', 'K. Das', 'A. Khan'].map((t) => <option key={t} value={t}>{t}</option>)}</Select>
          : <Textarea label="Resolution notes" rows={3} value={value} onChange={(e) => setValue(e.target.value)} />}
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={m.move.isPending} disabled={to === 'TECHNICIAN_ASSIGNED' && !value}>Confirm</Button></div>
      </div>
    </Modal>
  );
}
