import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, QrCode, ScanLine, Search } from 'lucide-react';
import { useAssets, useCategories, useDepartments, useAssetMutations } from '../../api/hooks';
import { useAuth, isManager } from '../../stores/auth';
import { useUI } from '../../stores/ui';
import { Card, Button, Input, Select, Modal, Pill, Skeleton, PageHeader, EmptyState } from '../../components/ui';
import { ASSET_STATUS } from '../../lib/status';
import { api, apiError } from '../../api/client';

const STATUSES = Object.keys(ASSET_STATUS);

export default function Assets() {
  const { user } = useAuth();
  const { setScanner } = useUI();
  const [params, setParams] = useSearchParams();
  const [filters, setFilters] = useState({ q: '', category: '', status: '', department: '' });
  const [open, setOpen] = useState(params.get('new') === '1');
  const { data, isLoading } = useAssets({ ...filters, page: 1, pageSize: 50 });
  const { data: cats } = useCategories();
  const { data: depts } = useDepartments();

  useEffect(() => { if (params.get('new') === '1') { setOpen(true); params.delete('new'); setParams(params, { replace: true }); } }, []);

  return (
    <div>
      <PageHeader title="Assets" subtitle="Register and track every asset centrally."
        actions={<>
          <Button variant="outline" onClick={() => setScanner(true)}><ScanLine size={16} /> Scan</Button>
          {isManager(user?.role) && <Button onClick={() => setOpen(true)}><Plus size={16} /> Register Asset</Button>}
        </>} />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-txt-muted" />
            <input value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Search by tag, serial, or name…"
              className="w-full rounded-lg border border-border bg-elevated py-2 pl-9 pr-3 text-sm" />
          </div>
          <select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm">
            <option value="">All categories</option>
            {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{ASSET_STATUS[s].label}</option>)}
          </select>
          <select value={filters.department} onChange={(e) => setFilters({ ...filters, department: e.target.value })} className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm">
            <option value="">All departments</option>
            {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-left text-xs uppercase text-txt-muted">
              <tr className="border-b border-border">
                <th className="px-4 py-2.5">Tag</th><th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Category</th><th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Location</th><th className="px-4 py-2.5">Dept</th><th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-border/60"><td colSpan={7} className="px-4 py-3"><Skeleton className="h-5 w-full" /></td></tr>
              ))}
              {data?.items.map((a) => (
                <tr key={a.id} className="border-b border-border/60 hover:bg-white/[0.02]">
                  <td className="px-4 py-3"><Link to={`/assets/${a.assetTag}`} className="font-mono text-primary hover:underline">{a.assetTag}</Link></td>
                  <td className="px-4 py-3 font-medium">{a.name}{a.isBookable && <span className="ml-2 rounded bg-info/15 px-1.5 py-0.5 text-[10px] text-info">bookable</span>}</td>
                  <td className="px-4 py-3 text-txt-muted">{a.category?.name}</td>
                  <td className="px-4 py-3"><Pill style={ASSET_STATUS[a.status]} /></td>
                  <td className="px-4 py-3 text-txt-muted">{a.location ?? '—'}</td>
                  <td className="px-4 py-3 text-txt-muted">{a.department?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right"><Link to={`/assets/${a.assetTag}`} className="text-txt-muted hover:text-primary"><QrCode size={15} /></Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!isLoading && !data?.items.length && <EmptyState title="No assets match" hint="Try clearing filters or register a new asset." />}
      </Card>

      {open && <RegisterModal onClose={() => setOpen(false)} />}
    </div>
  );
}

function RegisterModal({ onClose }: { onClose: () => void }) {
  const { data: cats } = useCategories();
  const { data: depts } = useDepartments();
  const { create } = useAssetMutations();
  const [form, setForm] = useState<any>({ name: '', categoryId: '', serialNumber: '', location: '', condition: 'GOOD', isBookable: false, departmentId: '', acquisitionCost: '', acquisitionDate: '' });
  const [customValues, setCustomValues] = useState<Record<string, any>>({});
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const cat = cats?.find((c) => c.id === form.categoryId);

  const upload = async (file: File) => {
    setUploading(true);
    const fd = new FormData(); fd.append('photo', file);
    try { const { data } = await api.post('/assets/upload', fd); setPhotoUrl(data.url); toast.success('Photo uploaded'); }
    catch (e) { toast.error(apiError(e).message); } finally { setUploading(false); }
  };

  const save = async () => {
    try {
      const body: any = {
        name: form.name, categoryId: form.categoryId, condition: form.condition, isBookable: form.isBookable,
        location: form.location || undefined, serialNumber: form.serialNumber || undefined,
        departmentId: form.departmentId || undefined, photoUrl: photoUrl || undefined,
        customFieldValues: Object.keys(customValues).length ? customValues : undefined,
      };
      if (form.acquisitionCost) body.acquisitionCost = Number(form.acquisitionCost);
      if (form.acquisitionDate) body.acquisitionDate = new Date(form.acquisitionDate).toISOString();
      const a = await create.mutateAsync(body);
      toast.success(`Registered ${a.assetTag}`); onClose();
    } catch (e) { toast.error(apiError(e).message); }
  };

  return (
    <Modal open onClose={onClose} title="Register asset" wide>
      <div className="grid gap-3 sm:grid-cols-2">
        <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Select label="Category" value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>
          <option value="">— select —</option>
          {cats?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
        <Input label="Serial number" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
        <Input label="Location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
        <Select label="Condition" value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>
          {['NEW', 'GOOD', 'FAIR', 'POOR'].map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <Select label="Department" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
          <option value="">— none —</option>
          {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Input label="Acquisition cost (₹)" type="number" value={form.acquisitionCost} onChange={(e) => setForm({ ...form, acquisitionCost: e.target.value })} />
        <Input label="Acquisition date" type="date" value={form.acquisitionDate} onChange={(e) => setForm({ ...form, acquisitionDate: e.target.value })} />

        {/* Dynamic category custom fields */}
        {cat?.customFields?.map((f) => (
          <Input key={f.key} label={f.label} type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
            value={customValues[f.key] ?? ''} onChange={(e) => setCustomValues({ ...customValues, [f.key]: e.target.value })} />
        ))}

        <label className="col-span-full flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isBookable} onChange={(e) => setForm({ ...form, isBookable: e.target.checked })} className="accent-primary" />
          Shared / bookable resource
        </label>
        <label className="col-span-full">
          <span className="mb-1.5 block text-xs font-medium text-txt-muted">Photo</span>
          <input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} className="text-sm text-txt-muted" />
          {uploading && <span className="ml-2 text-xs text-txt-muted">uploading…</span>}
          {photoUrl && <span className="ml-2 text-xs text-primary">✓ uploaded</span>}
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button onClick={save} loading={create.isPending} disabled={!form.name || !form.categoryId}>Register</Button>
      </div>
    </Modal>
  );
}
