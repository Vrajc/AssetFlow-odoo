import { useParams, Link } from 'react-router-dom';
import { QRCodeCanvas } from 'qrcode.react';
import { useState } from 'react';
import { Printer, MapPin, Tag, ArrowLeft, History, Wrench } from 'lucide-react';
import { useAsset } from '../../api/hooks';
import { Card, Pill, Skeleton, Button } from '../../components/ui';
import { ASSET_STATUS, CONDITION } from '../../lib/status';
import { fmtDate, fmtDateTime, fmtCurrency } from '../../lib/format';
import { fileUrl } from '../../api/client';

export default function AssetDetail() {
  const { id } = useParams();
  const { data: a, isLoading } = useAsset(id);
  const [tab, setTab] = useState<'alloc' | 'maint'>('alloc');

  if (isLoading || !a) return <div className="space-y-4"><Skeleton className="h-40 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const payload = `assetflow://asset/${a.assetTag}`;

  return (
    <div>
      <Link to="/assets" className="mb-4 inline-flex items-center gap-1.5 text-sm text-txt-muted hover:text-txt"><ArrowLeft size={15} /> Back to assets</Link>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Hero */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            {a.photoUrl ? (
              <img src={fileUrl(a.photoUrl)} alt={a.name} className="h-32 w-32 rounded-xl border border-border object-cover" />
            ) : (
              <div className="grid h-32 w-32 shrink-0 place-items-center rounded-xl border border-border bg-elevated text-txt-muted"><Tag size={28} /></div>
            )}
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <span className="font-mono text-primary">{a.assetTag}</span>
                <Pill style={ASSET_STATUS[a.status]} />
              </div>
              <h1 className="mt-1 font-display text-2xl font-bold">{a.name}</h1>
              <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                <Info label="Category" value={a.category?.name} />
                <Info label="Condition" value={<Pill style={CONDITION[a.condition]} />} />
                <Info label="Serial" value={a.serialNumber ?? '—'} />
                <Info label="Location" value={<span className="inline-flex items-center gap-1"><MapPin size={13} /> {a.location ?? '—'}</span>} />
                <Info label="Department" value={a.department?.name ?? '—'} />
                <Info label="Acquisition" value={fmtDate(a.acquisitionDate)} />
                <Info label="Cost" value={fmtCurrency(a.acquisitionCost)} />
                <Info label="Bookable" value={a.isBookable ? 'Yes' : 'No'} />
              </div>
              {!!a.customFieldValues && Object.keys(a.customFieldValues).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {Object.entries(a.customFieldValues).map(([k, v]) => (
                    <span key={k} className="rounded-md bg-black/[0.05] px-2 py-1 text-xs text-txt-muted">{k}: <span className="text-txt">{String(v)}</span></span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* QR */}
        <Card className="flex flex-col items-center justify-center gap-3 p-5">
          <div className="print-label rounded-xl bg-white p-3">
            <QRCodeCanvas value={payload} size={140} level="M" />
            <p className="mt-2 text-center font-mono text-sm text-black">{a.assetTag}</p>
            <p className="text-center text-xs text-black/70">{a.name}</p>
          </div>
          <Button variant="outline" onClick={() => window.print()}><Printer size={15} /> Print label</Button>
          <p className="text-center text-[11px] text-txt-muted">Scan encodes<br /><span className="font-mono">{payload}</span></p>
        </Card>
      </div>

      {/* Lifecycle timeline */}
      <Card className="mt-4 p-5">
        <h2 className="mb-4 font-display text-lg font-semibold">Lifecycle timeline</h2>
        {a.timeline?.length ? (
          <div className="relative flex gap-4 overflow-x-auto pb-2">
            {a.timeline.map((t: any, i: number) => (
              <div key={t.id} className="relative flex min-w-[160px] flex-col">
                <div className="flex items-center">
                  <div className="h-3 w-3 rounded-full bg-primary" />
                  {i < a.timeline.length - 1 && <div className="h-0.5 flex-1 bg-border" />}
                </div>
                <div className="mt-2 pr-4">
                  <p className="text-xs font-medium text-txt">{t.action.replace(/_/g, ' ')}</p>
                  <p className="text-[11px] text-txt-muted">{fmtDateTime(t.createdAt)}</p>
                  {t.actor && <p className="text-[11px] text-txt-muted">by {t.actor.name}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-txt-muted">No lifecycle events yet.</p>}
      </Card>

      {/* History tabs */}
      <Card className="mt-4 overflow-hidden">
        <div className="flex gap-1 border-b border-border p-2">
          <button onClick={() => setTab('alloc')} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${tab === 'alloc' ? 'bg-black/[0.05] text-txt' : 'text-txt-muted'}`}><History size={15} /> Allocation history</button>
          <button onClick={() => setTab('maint')} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${tab === 'maint' ? 'bg-black/[0.05] text-txt' : 'text-txt-muted'}`}><Wrench size={15} /> Maintenance history</button>
        </div>
        <div className="p-4">
          {tab === 'alloc' ? (
            a.allocations?.length ? (
              <div className="divide-y divide-border text-sm">
                {a.allocations.map((al: any) => (
                  <div key={al.id} className="flex items-center justify-between py-2.5">
                    <span>{fmtDate(al.allocatedAt)} — Allocated to <span className="text-txt">{al.allocatedTo.name}</span>{al.department?.name && ` · ${al.department.name}`}</span>
                    <span className="text-txt-muted">{al.returnedAt ? `Returned ${fmtDate(al.returnedAt)}${al.checkInCondition ? ` · ${al.checkInCondition}` : ''}` : <Pill style={{ label: al.status, dot: '#5B9BD5', bg: '#5B9BD520', text: '#5B9BD5' }} />}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-txt-muted">No allocation history.</p>
          ) : (
            a.maintenanceRequests?.length ? (
              <div className="divide-y divide-border text-sm">
                {a.maintenanceRequests.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <span>{fmtDate(m.createdAt)} — {m.issue}</span>
                    <span className="text-txt-muted">{m.status.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-txt-muted">No maintenance history.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return <div><p className="text-[11px] uppercase tracking-wide text-txt-muted">{label}</p><div className="mt-0.5">{value}</div></div>;
}
