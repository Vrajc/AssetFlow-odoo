import { useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useDepartments, useCategories, useUsers, useOrgMutations } from '../../api/hooks';
import { Card, Button, Input, Select, Modal, Pill, PageHeader, EmptyState } from '../../components/ui';
import { roleLabel } from '../../stores/auth';
import { apiError } from '../../api/client';

const TABS = ['Departments', 'Categories', 'Employee Directory'] as const;

export default function OrgSetup() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('Departments');
  return (
    <div>
      <PageHeader title="Organization Setup" subtitle="Master data everything else depends on. Editing here drives the pickers across every screen." />
      <div className="mb-5 flex gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm transition-colors ${tab === t ? 'bg-primary/15 text-primary font-medium' : 'text-txt-muted hover:text-txt'}`}>
            {t}
          </button>
        ))}
      </div>
      {tab === 'Departments' && <Departments />}
      {tab === 'Categories' && <Categories />}
      {tab === 'Employee Directory' && <Directory />}
    </div>
  );
}

/* ------------------------------ Departments ------------------------------- */
function Departments() {
  const { data: depts } = useDepartments();
  const { data: users } = useUsers();
  const { createDept, updateDept } = useOrgMutations();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState<any>({ name: '', headId: '', parentId: '', status: 'ACTIVE' });

  const start = (d?: any) => {
    setEdit(d ?? null);
    setForm(d ? { name: d.name, headId: d.headId ?? '', parentId: d.parentId ?? '', status: d.status } : { name: '', headId: '', parentId: '', status: 'ACTIVE' });
    setOpen(true);
  };
  const save = async () => {
    const body = { ...form, headId: form.headId || null, parentId: form.parentId || null };
    try {
      if (edit) await updateDept.mutateAsync({ id: edit.id, ...body });
      else await createDept.mutateAsync(body);
      toast.success('Saved'); setOpen(false);
    } catch (e) { toast.error(apiError(e).message); }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-medium">Departments</h3>
        <Button onClick={() => start()}><Plus size={16} /> Add Department</Button>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead className="text-left text-xs uppercase text-txt-muted">
          <tr className="border-b border-border">
            <th className="px-4 py-2.5">Department</th><th className="px-4 py-2.5">Head</th>
            <th className="px-4 py-2.5">Parent</th><th className="px-4 py-2.5">Assets</th>
            <th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th>
          </tr>
        </thead>
        <tbody>
          {depts?.map((d) => (
            <tr key={d.id} className="border-b border-border/60 hover:bg-tint/50">
              <td className="px-4 py-3 font-medium" style={{ paddingLeft: d.parentId ? 32 : 16 }}>{d.parentId && '↳ '}{d.name}</td>
              <td className="px-4 py-3 text-txt-muted">{d.head?.name ?? '—'}</td>
              <td className="px-4 py-3 text-txt-muted">{d.parent?.name ?? '—'}</td>
              <td className="px-4 py-3 tnum">{d._count?.assets ?? 0}</td>
              <td className="px-4 py-3"><Pill style={{ label: d.status === 'ACTIVE' ? 'Active' : 'Inactive', dot: d.status === 'ACTIVE' ? '#21B799' : '#8F8F9F', bg: d.status === 'ACTIVE' ? '#21B79920' : '#8F8F9F20', text: d.status === 'ACTIVE' ? '#21B799' : '#8F8F9F' }} /></td>
              <td className="px-4 py-3 text-right"><button onClick={() => start(d)} className="text-txt-muted hover:text-txt"><Pencil size={15} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit department' : 'New department'}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Department Head" value={form.headId} onChange={(e) => setForm({ ...form, headId: e.target.value })}>
            <option value="">— none —</option>
            {users?.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </Select>
          <Select label="Parent Department (optional)" value={form.parentId} onChange={(e) => setForm({ ...form, parentId: e.target.value })}>
            <option value="">— none —</option>
            {depts?.filter((d) => d.id !== edit?.id).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
          </Select>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={createDept.isPending || updateDept.isPending}>Save</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

/* ------------------------------- Categories ------------------------------- */
function Categories() {
  const { data: cats } = useCategories();
  const { createCategory, updateCategory, deleteCategory } = useOrgMutations();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [name, setName] = useState('');
  const [fields, setFields] = useState<{ key: string; label: string; type: string }[]>([]);

  const start = (c?: any) => {
    setEdit(c ?? null); setName(c?.name ?? ''); setFields(c?.customFields ?? []); setOpen(true);
  };
  const save = async () => {
    const body = { name, customFields: fields };
    try {
      if (edit) await updateCategory.mutateAsync({ id: edit.id, ...body });
      else await createCategory.mutateAsync(body);
      toast.success('Saved'); setOpen(false);
    } catch (e) { toast.error(apiError(e).message); }
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-medium">Asset Categories</h3>
        <Button onClick={() => start()}><Plus size={16} /> Add Category</Button>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        {cats?.map((c) => (
          <Card key={c.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-txt-muted">{c._count?.assets ?? 0} assets</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => start(c)} className="text-txt-muted hover:text-txt"><Pencil size={14} /></button>
                <button onClick={() => deleteCategory.mutate(c.id, { onError: (e) => toast.error(apiError(e).message), onSuccess: () => toast.success('Deleted') })} className="text-txt-muted hover:text-danger"><Trash2 size={14} /></button>
              </div>
            </div>
            {!!c.customFields?.length && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.customFields.map((f) => <span key={f.key} className="rounded-md bg-black/[0.05] px-2 py-0.5 text-[11px] text-txt-muted">{f.label}</span>)}
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={edit ? 'Edit category' : 'New category'}>
        <div className="space-y-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-medium text-txt-muted">Category-specific fields</span>
              <button className="text-xs text-primary" onClick={() => setFields([...fields, { key: '', label: '', type: 'text' }])}>+ Add field</button>
            </div>
            <div className="space-y-2">
              {fields.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <input placeholder="label" value={f.label} onChange={(e) => { const n = [...fields]; n[i] = { ...f, label: e.target.value, key: e.target.value.toLowerCase().replace(/\s+/g, '_') }; setFields(n); }} className="flex-1 rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm" />
                  <select value={f.type} onChange={(e) => { const n = [...fields]; n[i] = { ...f, type: e.target.value }; setFields(n); }} className="rounded-lg border border-border bg-elevated px-2 py-1.5 text-sm">
                    <option value="text">text</option><option value="number">number</option><option value="date">date</option>
                  </select>
                  <button onClick={() => setFields(fields.filter((_, j) => j !== i))} className="text-txt-muted hover:text-danger"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save} loading={createCategory.isPending || updateCategory.isPending}>Save</Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

/* --------------------------- Employee Directory --------------------------- */
const ROLES = ['EMPLOYEE', 'DEPARTMENT_HEAD', 'ASSET_MANAGER', 'ADMIN'];
function Directory() {
  const [q, setQ] = useState('');
  const { data: users } = useUsers(q ? { q } : undefined);
  const { data: depts } = useDepartments();
  const { setRole, setStatus, setDept } = useOrgMutations();

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-4">
        <h3 className="font-medium">Employee Directory</h3>
        <Input placeholder="Search name or email…" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-64" />
      </div>
      <p className="border-b border-border bg-black/[0.02] px-4 py-2 text-xs text-txt-muted">
        This is the <span className="text-txt">only</span> place roles are assigned — promote employees to Department Head or Asset Manager here.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="text-left text-xs uppercase text-txt-muted">
            <tr className="border-b border-border">
              <th className="px-4 py-2.5">Name</th><th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Department</th><th className="px-4 py-2.5">Role</th><th className="px-4 py-2.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u) => (
              <tr key={u.id} className="border-b border-border/60 hover:bg-tint/50">
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-txt-muted">{u.email}</td>
                <td className="px-4 py-3">
                  <select value={u.department?.id ?? ''} onChange={(e) => setDept.mutate({ id: u.id, departmentId: e.target.value || null }, { onSuccess: () => toast.success('Updated') })}
                    className="rounded-md border border-border bg-elevated px-2 py-1 text-xs">
                    <option value="">—</option>
                    {depts?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select value={u.role} onChange={(e) => setRole.mutate({ id: u.id, role: e.target.value }, { onSuccess: () => toast.success(`Now ${roleLabel(e.target.value)}`) })}
                    className="rounded-md border border-border bg-elevated px-2 py-1 text-xs">
                    {ROLES.map((r) => <option key={r} value={r}>{roleLabel(r)}</option>)}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setStatus.mutate({ id: u.id, status: u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' }, { onSuccess: () => toast.success('Updated') })}>
                    <Pill style={{ label: u.status === 'ACTIVE' ? 'Active' : 'Inactive', dot: u.status === 'ACTIVE' ? '#21B799' : '#8F8F9F', bg: u.status === 'ACTIVE' ? '#21B79920' : '#8F8F9F20', text: u.status === 'ACTIVE' ? '#21B799' : '#8F8F9F' }} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!users?.length && <EmptyState title="No employees found" />}
    </Card>
  );
}
