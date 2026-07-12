import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download, TrendingUp, Clock } from 'lucide-react';
import { useUtilization, useMaintFreq, useMostUsedIdle, useDueSoon, useHeatmap, useDeptAllocation } from '../../api/hooks';
import { Card, PageHeader, Button } from '../../components/ui';
import { API_URL } from '../../api/client';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Reports() {
  const { data: util } = useUtilization('department');
  const { data: freq } = useMaintFreq();
  const { data: mui } = useMostUsedIdle();
  const { data: due } = useDueSoon();
  const { data: heat } = useHeatmap();
  const { data: deptAlloc } = useDeptAllocation();

  const maxHeat = Math.max(1, ...(heat?.grid.flat() ?? [1]));
  const exportUrl = (type: string) => `${API_URL}/api/v1/reports/export?type=${type}`;

  return (
    <div>
      <PageHeader title="Reports & Analytics" subtitle="Actionable operational insight." />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Utilization by department */}
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Utilization by department</h3>
            <a href={exportUrl('utilization')} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Download size={12} /> CSV</a>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={util ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1A1E23', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
              <Bar dataKey="allocated" stackId="a" fill="#60A5FA" radius={[0, 0, 0, 0]} />
              <Bar dataKey="available" stackId="a" fill="#10B981" />
              <Bar dataKey="maintenance" stackId="a" fill="#FBBF24" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Maintenance frequency trend */}
        <Card className="p-5">
          <h3 className="mb-3 font-medium">Maintenance frequency</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={freq?.trend ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <YAxis tick={{ fill: '#9CA3AF', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#1A1E23', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8 }} />
              <Line type="monotone" dataKey="count" stroke="#F87171" strokeWidth={2} dot={{ fill: '#F87171' }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Most used / idle */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-medium"><TrendingUp size={16} className="text-primary" /> Most-used assets</h3>
          <div className="space-y-1.5">
            {mui?.mostUsed?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
                <span><span className="font-mono text-primary">{a.assetTag}</span> · {a.name}</span>
                <span className="text-txt-muted tnum">{a.uses} uses</span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 font-medium"><Clock size={16} className="text-warning" /> Idle assets (45+ days)</h3>
          <div className="space-y-1.5">
            {mui?.idle?.length ? mui.idle.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2 text-sm">
                <span><span className="font-mono text-primary">{a.assetTag}</span> · {a.name}</span>
                <span className="text-txt-muted">idle</span>
              </div>
            )) : <p className="py-4 text-center text-sm text-txt-muted">No idle assets.</p>}
          </div>
        </Card>
      </div>

      {/* Due soon + dept allocation */}
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-medium">Due for maintenance / nearing retirement</h3>
          <div className="space-y-1.5 text-sm">
            {due?.nearingRetirement?.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <span><span className="font-mono text-primary">{a.assetTag}</span> · {a.name}</span>
                <span className="text-warning text-xs">{a.condition === 'POOR' ? 'poor condition' : 'nearing retirement'}</span>
              </div>
            ))}
            {!due?.nearingRetirement?.length && <p className="py-4 text-center text-txt-muted">Nothing flagged.</p>}
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium">Department-wise allocation</h3>
            <a href={exportUrl('dept-allocation')} className="text-xs text-primary hover:underline inline-flex items-center gap-1"><Download size={12} /> CSV</a>
          </div>
          <div className="space-y-1.5 text-sm">
            {deptAlloc?.map((d: any) => (
              <div key={d.name} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                <span>{d.name}</span>
                <span className="text-txt-muted tnum">{d.assets} assets · {d.members} members</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Booking heatmap */}
      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-medium">Resource booking heatmap</h3>
        <p className="mb-3 text-xs text-txt-muted">Peak usage windows — darker = more bookings.</p>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="flex">
              <div className="w-10" />
              {Array.from({ length: 24 }, (_, h) => <div key={h} className="flex-1 text-center text-[9px] text-txt-muted">{h}</div>)}
            </div>
            {heat?.grid.map((row, d) => (
              <div key={d} className="flex items-center">
                <div className="w-10 text-[10px] text-txt-muted">{DAYS[d]}</div>
                {row.map((v, h) => (
                  <div key={h} className="m-[1px] flex-1 rounded-sm" style={{ aspectRatio: '1', minWidth: 14, background: v ? `rgba(16,185,129,${0.15 + (v / maxHeat) * 0.85})` : 'rgba(255,255,255,0.03)' }} title={`${DAYS[d]} ${h}:00 — ${v} booking(s)`} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <div className="mt-4 flex justify-end">
        <a href={exportUrl('utilization')}><Button variant="outline"><Download size={16} /> Export report</Button></a>
      </div>
    </div>
  );
}
