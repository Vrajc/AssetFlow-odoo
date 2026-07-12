import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlertTriangle, ArrowLeftRight, Check, X, RotateCcw } from 'lucide-react';
import { useAllocations, useTransfers, useAssets, useUsers, useAllocationMutations } from '../../api/hooks';
import { useAuth, isManager, canApprove } from '../../stores/auth';
import { Card, Button, Select, Input, Textarea, Modal, Pill, PageHeader, EmptyState } from '../../components/ui';
import { TRANSFER_STATUS } from '../../lib/status';
import { fmtDate } from '../../lib/format';
import { apiError } from '../../api/client';

export default function Allocations() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const overdueOnly = params.get('overdue') === 'true';
  const { data: allocations } = useAllocations(overdueOnly ? { overdue: 'true' } : { status: 'ACTIVE' });
  const { data: transfers } = useTransfers();
  const m = useAllocationMutations();
  const [returnFor, setReturnFor] = useState<any>(null);

  return (
    <div>
      <PageHeader title="Allocation & Transfer" subtitle="Manage who holds what, with explicit conflict rules." />

      <div className="grid gap-4 lg:grid-cols-2">
        {isManager(user?.role) && <AllocateForm />}

        {/* Transfer approvals queue */}
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-medium"><ArrowLeftRight size={16} /> Transfer requests</h3>
          <div className="space-y-2">
            {transfers?.filter((t) => t.status === 'REQUESTED').map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-elevated p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-primary">{t.asset.assetTag}</span>
                  <Pill style={TRANSFER_STATUS[t.status]} />
                </div>
                <p className="mt-1 text-txt-muted">{t.fromUser.name} → <span className="text-txt">{t.toUser.name}</span></p>
                <p className="mt-1 text-xs text-txt-muted">“{t.reason}”</p>
                {canApprove(user?.role) && (
                  <div className="mt-2 flex gap-2">
                    <Button className="!py-1.5" onClick={() => m.approveTransfer.mutate(t.id, { onSuccess: () => toast.success('Transfer approved'), onError: (e) => toast.error(apiError(e).message) })}><Check size={14} /> Approve</Button>
                    <Button variant="ghost" className="!py-1.5" onClick={() => { const r = prompt('Reason for rejection?') ?? ''; m.rejectTransfer.mutate({ id: t.id, reason: r }, { onSuccess: () => toast.success('Rejected') }); }}><X size={14} /> Reject</Button>
                  </div>
                )}
              </div>
            ))}
            {!transfers?.filter((t) => t.status === 'REQUESTED').length && <p className="py-4 text-center text-sm text-txt-muted">No pending transfer requests.</p>}
          </div>
        </Card>
      </div>

      {/* Allocation list */}
      <Card className="mt-4 overflow-hidden">
        <div className="border-b border-border p-4">
          <h3 className="font-medium">{overdueOnly ? 'Overdue allocations' : 'Active allocations'}</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase text-txt-muted">
              <tr className="border-b border-border"><th className="px-4 py-2.5">Asset</th><th className="px-4 py-2.5">Holder</th><th className="px-4 py-2.5">Allocated</th><th className="px-4 py-2.5">Expected return</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th></tr>
            </thead>
            <tbody>
              {allocations?.map((al) => {
                const overdue = al.status === 'OVERDUE' || (al.expectedReturnDate && new Date(al.expectedReturnDate) < new Date() && !al.returnedAt);
                return (
                  <tr key={al.id} className={`border-b border-border/60 ${overdue ? 'bg-danger/5' : 'hover:bg-white/[0.02]'}`}>
                    <td className="px-4 py-3"><span className="font-mono text-primary">{al.asset.assetTag}</span> · {al.asset.name}</td>
                    <td className="px-4 py-3">{al.allocatedTo.name}<span className="text-txt-muted">{al.allocatedTo.department?.name ? ` · ${al.allocatedTo.department.name}` : ''}</span></td>
                    <td className="px-4 py-3 text-txt-muted">{fmtDate(al.allocatedAt)}</td>
                    <td className={`px-4 py-3 ${overdue ? 'text-danger' : 'text-txt-muted'}`}>{fmtDate(al.expectedReturnDate)}</td>
                    <td className="px-4 py-3">{overdue ? <Pill style={{ label: 'Overdue', dot: '#F87171', bg: '#F8717120', text: '#F87171' }} /> : <Pill style={{ label: 'Active', dot: '#60A5FA', bg: '#60A5FA20', text: '#60A5FA' }} />}</td>
                    <td className="px-4 py-3 text-right">{isManager(user?.role) && <button onClick={() => setReturnFor(al)} className="inline-flex items-center gap-1 text-xs text-txt-muted hover:text-primary"><RotateCcw size={13} /> Return</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!allocations?.length && <EmptyState title="No allocations" />}
      </Card>

      {returnFor && <ReturnModal allocation={returnFor} onClose={() => setReturnFor(null)} />}
    </div>
  );
}

/* ------------------------- Allocate form (conflict) ----------------------- */
function AllocateForm() {
  const { data: assetsAvail } = useAssets({ status: 'AVAILABLE', pageSize: 100 });
  const { data: allAssets } = useAssets({ pageSize: 200 });
  const { data: users } = useUsers({ status: 'ACTIVE' });
  const m = useAllocationMutations();
  const [assetId, setAssetId] = useState('');
  const [toUser, setToUser] = useState('');
  const [expected, setExpected] = useState('');
  const [conflict, setConflict] = useState<any>(null);
  const [reason, setReason] = useState('');

  const selected = allAssets?.items.find((a) => a.id === assetId);
  const isAllocated = selected && selected.status !== 'AVAILABLE';

  const allocate = async () => {
    setConflict(null);
    try {
      await m.allocate.mutateAsync({ assetId, allocatedToId: toUser, expectedReturnDate: expected ? new Date(expected).toISOString() : undefined });
      toast.success('Asset allocated'); setAssetId(''); setToUser(''); setExpected('');
    } catch (e) {
      const err = apiError(e);
      if (err.code === 'ASSET_ALREADY_ALLOCATED') setConflict(err.details);
      else toast.error(err.message);
    }
  };

  const submitTransfer = async () => {
    try {
      await m.requestTransfer.mutateAsync({ assetId, toUserId: toUser, reason });
      toast.success('Transfer request submitted'); setConflict(null); setReason(''); setAssetId(''); setToUser('');
    } catch (e) { toast.error(apiError(e).message); }
  };

  return (
    <Card className="p-5">
      <h3 className="mb-3 font-medium">Allocate an asset</h3>
      <div className="space-y-3">
        <Select label="Asset" value={assetId} onChange={(e) => { setAssetId(e.target.value); setConflict(null); }}>
          <option value="">— select asset —</option>
          <optgroup label="Available">
            {assetsAvail?.items.map((a) => <option key={a.id} value={a.id}>{a.assetTag} · {a.name}</option>)}
          </optgroup>
          <optgroup label="Currently held (will require transfer)">
            {allAssets?.items.filter((a) => a.status === 'ALLOCATED').map((a) => <option key={a.id} value={a.id}>{a.assetTag} · {a.name}</option>)}
          </optgroup>
        </Select>

        {/* The double-allocation block in action */}
        {isAllocated && !conflict && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <div className="flex items-center gap-2 font-medium"><AlertTriangle size={15} /> Already allocated — {selected?.name}</div>
            <p className="mt-1 text-danger/90">Direct re-allocation is blocked. Submit a transfer request below.</p>
          </div>
        )}
        {conflict && (
          <div className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">
            <div className="flex items-center gap-2 font-medium"><AlertTriangle size={15} /> Already allocated to {conflict.currentHolder?.name} {conflict.currentHolder?.department ? `(${conflict.currentHolder.department})` : ''}</div>
            <p className="mt-1 text-danger/90">Direct re-allocation is blocked — submit a transfer request.</p>
          </div>
        )}

        <Select label="Allocate to" value={toUser} onChange={(e) => setToUser(e.target.value)}>
          <option value="">— select employee —</option>
          {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </Select>

        {(isAllocated || conflict) ? (
          <>
            <Textarea label="Transfer reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why should this asset be transferred?" />
            <Button variant="danger" className="w-full" onClick={submitTransfer} disabled={!assetId || !toUser || reason.length < 3} loading={m.requestTransfer.isPending}>
              <ArrowLeftRight size={16} /> Submit a Transfer Request
            </Button>
          </>
        ) : (
          <>
            <Input label="Expected return date (optional)" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
            <Button className="w-full" onClick={allocate} disabled={!assetId || !toUser} loading={m.allocate.isPending}>Allocate asset</Button>
          </>
        )}
      </div>
    </Card>
  );
}

function ReturnModal({ allocation, onClose }: { allocation: any; onClose: () => void }) {
  const m = useAllocationMutations();
  const [condition, setCondition] = useState('GOOD');
  const [notes, setNotes] = useState('');
  const submit = async () => {
    try { await m.returnAsset.mutateAsync({ id: allocation.id, condition, notes }); toast.success('Return confirmed'); onClose(); }
    catch (e) { toast.error(apiError(e).message); }
  };
  return (
    <Modal open onClose={onClose} title={`Return ${allocation.asset.assetTag}`}>
      <div className="space-y-3">
        <Select label="Check-in condition" value={condition} onChange={(e) => setCondition(e.target.value)}>
          {['NEW', 'GOOD', 'FAIR', 'POOR'].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Textarea label="Check-in notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any damage or observations…" />
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button onClick={submit} loading={m.returnAsset.isPending}>Confirm return</Button></div>
      </div>
    </Modal>
  );
}
