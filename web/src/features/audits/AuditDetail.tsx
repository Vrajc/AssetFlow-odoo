import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import { ArrowLeft, ScanLine, Lock, AlertTriangle, Download, Camera } from 'lucide-react';
import { useAuditCycle, useDiscrepancyReport, useAuditMutations } from '../../api/hooks';
import { useAuth } from '../../stores/auth';
import { Card, Button, Pill, Skeleton, Modal } from '../../components/ui';
import { AUDIT_VERIFY } from '../../lib/status';
import { API_URL, apiError } from '../../api/client';

const VERIFY = ['VERIFIED', 'MISSING', 'DAMAGED'] as const;

export default function AuditDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: cycle, isLoading } = useAuditCycle(id);
  const { data: report } = useDiscrepancyReport(id);
  const m = useAuditMutations();
  const [scanOpen, setScanOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);

  if (isLoading || !cycle) return <div className="space-y-4"><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;
  const closed = cycle.status === 'CLOSED';
  const discrepancies = report?.discrepancies ?? [];

  const mark = (itemId: string, verification: string) =>
    m.mark.mutate({ id: itemId, verification }, { onSuccess: () => toast.success(verification), onError: (e) => toast.error(apiError(e).message) });

  return (
    <div>
      <Link to="/audits" className="mb-4 inline-flex items-center gap-1.5 text-sm text-txt-muted hover:text-txt"><ArrowLeft size={15} /> Back to audits</Link>

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold">{cycle.name}</h1>
            <Pill style={closed ? { label: 'Closed', dot: '#9CA3AF', bg: '#9CA3AF20', text: '#9CA3AF' } : { label: 'Open', dot: '#10B981', bg: '#10B98120', text: '#10B981' }} />
          </div>
          <p className="mt-1 text-sm text-txt-muted">{cycle.done}/{cycle.total} verified · Auditors: {cycle.auditors?.map((a: any) => a.auditor.name).join(', ')}</p>
          <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${cycle.progress}%` }} />
          </div>
        </div>
        <div className="flex gap-2">
          {!closed && <Button variant="outline" onClick={() => setScanOpen(true)}><ScanLine size={16} /> Scan to verify</Button>}
          {!closed && user?.role === 'ADMIN' && <Button onClick={() => setCloseOpen(true)}><Lock size={16} /> Close Cycle</Button>}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Checklist */}
        <Card className="lg:col-span-2 overflow-hidden">
          <div className="border-b border-border p-4"><h3 className="font-medium">Checklist</h3></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="text-left text-xs uppercase text-txt-muted"><tr className="border-b border-border"><th className="px-4 py-2.5">Asset</th><th className="px-4 py-2.5">Expected location</th><th className="px-4 py-2.5">Verification</th></tr></thead>
              <tbody>
                {cycle.items?.map((it: any) => (
                  <tr key={it.id} className="border-b border-border/60">
                    <td className="px-4 py-3"><span className="font-mono text-primary">{it.asset.assetTag}</span> · {it.asset.name}</td>
                    <td className="px-4 py-3 text-txt-muted">{it.expectedLocation ?? '—'}</td>
                    <td className="px-4 py-3">
                      {closed ? <Pill style={AUDIT_VERIFY[it.verification]} /> : (
                        <div className="inline-flex overflow-hidden rounded-lg border border-border">
                          {VERIFY.map((v) => (
                            <button key={v} onClick={() => mark(it.id, v)}
                              className={`px-2.5 py-1 text-xs ${it.verification === v ? 'text-bg font-medium' : 'text-txt-muted hover:bg-white/5'}`}
                              style={it.verification === v ? { background: AUDIT_VERIFY[v].text } : {}}>
                              {AUDIT_VERIFY[v].label}
                            </button>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Discrepancy report */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-medium"><AlertTriangle size={16} className="text-warning" /> Discrepancy report</h3>
            {!!discrepancies.length && (
              <a href={`${API_URL}/api/v1/audit-cycles/${id}/discrepancy-report?format=csv`} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Download size={12} /> CSV</a>
            )}
          </div>
          <p className="mb-2 text-xs text-txt-muted">Auto-generated from flagged items.</p>
          <div className="space-y-2">
            {discrepancies.map((d: any) => (
              <div key={d.id} className="rounded-lg border border-border bg-elevated p-2.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-primary">{d.asset.assetTag}</span>
                  <Pill style={AUDIT_VERIFY[d.verification]} />
                </div>
                <p className="mt-0.5 text-xs text-txt-muted">{d.asset.name}{d.notes ? ` · ${d.notes}` : ''}</p>
              </div>
            ))}
            {!discrepancies.length && <p className="py-4 text-center text-sm text-txt-muted">No discrepancies flagged.</p>}
          </div>
        </Card>
      </div>

      {scanOpen && <AuditScanner cycleId={id!} onClose={() => setScanOpen(false)} />}
      {closeOpen && <CloseModal cycleId={id!} discrepancies={discrepancies} onClose={() => setCloseOpen(false)} />}
    </div>
  );
}

/* --------------------------- Audit-mode scanner --------------------------- */
function AuditScanner({ cycleId, onClose }: { cycleId: string; onClose: () => void }) {
  const m = useAuditMutations();
  const [tag, setTag] = useState<string | null>(null);
  const [scanner, setScanner] = useState<Html5Qrcode | null>(null);
  const [manual, setManual] = useState('');

  const start = async () => {
    try {
      const s = new Html5Qrcode('audit-qr'); setScanner(s);
      await s.start({ facingMode: 'environment' }, { fps: 10, qrbox: 200 }, (text) => {
        const t = text.replace('assetflow://asset/', '').trim();
        setTag(t); s.stop().catch(() => {});
      }, () => {});
    } catch { toast.error('Camera unavailable — enter tag manually'); }
  };

  const doMark = (verification: string) => {
    if (!tag) return;
    m.markByTag.mutate({ cycleId, assetTag: tag, verification }, {
      onSuccess: () => { toast.success(`${tag} → ${verification}`); setTag(null); },
      onError: (e) => toast.error(apiError(e).message),
    });
  };

  return (
    <Modal open onClose={() => { scanner?.stop().catch(() => {}); onClose(); }} title="Scan to verify (audit mode)">
      <div className="space-y-4">
        {!tag ? (
          <>
            <div id="audit-qr" className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl border border-border bg-black" />
            <Button variant="outline" className="w-full" onClick={start}><Camera size={16} /> Start camera</Button>
            <form onSubmit={(e) => { e.preventDefault(); if (manual.trim()) setTag(manual.trim().replace('assetflow://asset/', '')); }} className="flex gap-2">
              <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Enter tag e.g. AF-0114" className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm" />
              <Button type="submit">Load</Button>
            </form>
          </>
        ) : (
          <div className="space-y-3 text-center">
            <p className="text-sm text-txt-muted">Marking</p>
            <p className="font-mono text-2xl text-primary">{tag}</p>
            <div className="grid grid-cols-3 gap-2">
              {VERIFY.map((v) => (
                <button key={v} onClick={() => doMark(v)} className="rounded-lg px-3 py-3 text-sm font-medium text-bg" style={{ background: AUDIT_VERIFY[v].text }}>{AUDIT_VERIFY[v].label}</button>
              ))}
            </div>
            <Button variant="ghost" className="w-full" onClick={() => setTag(null)}>Scan another</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function CloseModal({ cycleId, discrepancies, onClose }: { cycleId: string; discrepancies: any[]; onClose: () => void }) {
  const m = useAuditMutations();
  const missing = discrepancies.filter((d) => d.verification === 'MISSING').length;
  const damaged = discrepancies.filter((d) => d.verification === 'DAMAGED').length;
  const submit = async () => {
    try { const r = await m.close.mutateAsync(cycleId); toast.success(`Cycle closed — ${r.lost} lost, ${r.maintenanceCreated} maintenance created`); onClose(); }
    catch (e) { toast.error(apiError(e).message); }
  };
  return (
    <Modal open onClose={onClose} title="Close audit cycle">
      <div className="space-y-3">
        <p className="text-sm text-txt-muted">Closing locks the cycle and applies these consequences:</p>
        <ul className="space-y-2 text-sm">
          <li className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-danger">{missing} confirmed-missing asset{missing !== 1 ? 's' : ''} → marked <b>LOST</b></li>
          <li className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-warning">{damaged} damaged asset{damaged !== 1 ? 's' : ''} → auto-creates a <b>maintenance request</b></li>
        </ul>
        <div className="flex justify-end gap-2"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="danger" onClick={submit} loading={m.close.isPending}><Lock size={15} /> Close cycle</Button></div>
      </div>
    </Modal>
  );
}
