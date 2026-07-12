import { format } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface ReportData {
  util?: any[];
  freq?: { byCategory: any[]; trend: any[] };
  mui?: { mostUsed: any[]; idle: any[] };
  due?: { nearingRetirement: any[]; dueMaintenance: any[] };
  deptAlloc?: any[];
  heat?: { grid: number[][] };
}

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));

function table(headers: string[], rows: (string | number)[][]): string {
  if (!rows.length) return `<p class="empty">No data.</p>`;
  return `<table>
    <thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function heatmap(grid: number[][]): string {
  const max = Math.max(1, ...grid.flat());
  const head = `<tr><th></th>${Array.from({ length: 24 }, (_, h) => `<th class="hh">${h}</th>`).join('')}</tr>`;
  const body = grid
    .map((row, d) => `<tr><td class="dl">${DAYS[d]}</td>${row
      .map((v) => `<td class="cell" style="background:${v ? `rgba(113,75,103,${0.18 + (v / max) * 0.82})` : '#F4F2F8'};color:${v && v / max > 0.5 ? '#fff' : '#1F2937'}" title="${v}">${v || ''}</td>`)
      .join('')}</tr>`)
    .join('');
  return `<table class="heat">${head}${body}</table>`;
}

/** Build a clean, self-contained HTML report and open it in a print window. */
export function printReport(data: ReportData): void {
  const now = new Date();
  const html = `<!doctype html><html><head><meta charset="utf-8" />
  <title>AssetFlow Operational Report</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, Segoe UI, Roboto, sans-serif; color: #1F2937; margin: 0; padding: 40px; background: #FFFFFF; }
    header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #714B67; padding-bottom: 16px; margin-bottom: 24px; }
    .brand { display: flex; align-items: center; gap: 12px; }
    .logo { width: 40px; height: 40px; border-radius: 10px; background: #714B67; color: #fff; display: grid; place-items: center; font-weight: 700; font-size: 20px; }
    h1 { font-family: 'Caveat', cursive; font-size: 32px; line-height: 1; margin: 0; color: #714B67; }
    .sub { color: #6B7280; font-size: 12px; margin-top: 2px; }
    h2 { font-size: 15px; margin: 28px 0 10px; color: #714B67; padding-left: 10px; border-left: 4px solid; border-image: linear-gradient(#714B67, #21B799) 1; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { text-align: left; padding: 7px 10px; border-bottom: 1px solid #EBEBF0; }
    th { background: #F4F2F8; font-weight: 600; color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.03em; }
    tbody tr:nth-child(even) { background: #FBFAFD; }
    .tag { font-family: 'Inter', monospace; color: #714B67; font-weight: 600; }
    .empty { color: #8F8F9F; font-size: 12px; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    .heat td, .heat th { padding: 0; border: 2px solid #fff; text-align: center; }
    .heat .cell { width: 26px; height: 22px; font-size: 8px; color: #1F2937; }
    .heat .hh { font-size: 8px; color: #8F8F9F; }
    .heat .dl { font-size: 9px; color: #6B7280; padding-right: 6px; width: 34px; }
    footer { margin-top: 32px; border-top: 1px solid #EBEBF0; padding-top: 10px; font-size: 10px; color: #8F8F9F; }
    @media print { body { padding: 16px; } h2 { break-after: avoid; } table { break-inside: auto; } }
  </style></head><body>
    <header>
      <div class="brand"><div class="logo">A</div><div><h1>AssetFlow — Operational Report</h1><div class="sub">Enterprise Asset &amp; Resource Management</div></div></div>
      <div class="sub">Generated ${format(now, 'PPP p')}</div>
    </header>

    <h2>Utilization by department</h2>
    ${table(['Department', 'Total', 'Allocated', 'Available', 'Maintenance', 'Utilization %'],
      (data.util ?? []).map((d) => [d.name, d.total, d.allocated, d.available, d.maintenance, `${d.utilizationPct}%`]))}

    <div class="grid2">
      <div>
        <h2>Most-used assets</h2>
        ${table(['Tag', 'Name', 'Uses'], (data.mui?.mostUsed ?? []).map((a) => [a.assetTag, a.name, a.uses]))}
      </div>
      <div>
        <h2>Idle assets (45+ days)</h2>
        ${table(['Tag', 'Name'], (data.mui?.idle ?? []).map((a) => [a.assetTag, a.name]))}
      </div>
    </div>

    <div class="grid2">
      <div>
        <h2>Maintenance frequency by category</h2>
        ${table(['Category', 'Requests'], (data.freq?.byCategory ?? []).map((c) => [c.name, c.count]))}
      </div>
      <div>
        <h2>Nearing retirement / due maintenance</h2>
        ${table(['Tag', 'Name', 'Condition'], (data.due?.nearingRetirement ?? []).map((a) => [a.assetTag, a.name, a.condition]))}
      </div>
    </div>

    <h2>Department-wise allocation</h2>
    ${table(['Department', 'Assets', 'Members'], (data.deptAlloc ?? []).map((d) => [d.name, d.assets, d.members]))}

    <h2>Resource booking heatmap</h2>
    ${data.heat ? heatmap(data.heat.grid) : '<p class="empty">No data.</p>'}

    <footer>AssetFlow — generated automatically. This report contains operational data only (no financial/accounting figures).</footer>
    <script>window.onload = function () { window.print(); };</script>
  </body></html>`;

  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) {
    throw new Error('Popup blocked — allow popups for this site to export the report.');
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
}
