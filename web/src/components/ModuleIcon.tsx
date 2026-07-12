import {
  Boxes, ArrowLeftRight, CalendarClock, Wrench, ClipboardCheck,
  BarChart3, Bell, Building2, LayoutDashboard,
} from 'lucide-react';

/**
 * Odoo-style app-icon tile: a colorful lucide glyph on a white rounded square
 * with a hairline border. Reused in the sidebar and the landing module grid.
 */
export interface ModuleDef {
  key: string;
  label: string;
  to: string;
  icon: any;
  color: string;
}

export const MODULES: ModuleDef[] = [
  { key: 'dashboard', label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard, color: '#714B67' },
  { key: 'assets', label: 'Assets', to: '/assets', icon: Boxes, color: '#21B799' },
  { key: 'allocation', label: 'Allocation & Transfer', to: '/allocations', icon: ArrowLeftRight, color: '#5B9BD5' },
  { key: 'booking', label: 'Resource Booking', to: '/bookings', icon: CalendarClock, color: '#E9A93D' },
  { key: 'maintenance', label: 'Maintenance', to: '/maintenance', icon: Wrench, color: '#E4585B' },
  { key: 'audit', label: 'Audit', to: '/audits', icon: ClipboardCheck, color: '#714B67' },
  { key: 'reports', label: 'Reports', to: '/reports', icon: BarChart3, color: '#21B799' },
  { key: 'notifications', label: 'Notifications', to: '/notifications', icon: Bell, color: '#5B9BD5' },
  { key: 'org', label: 'Org Setup', to: '/organization', icon: Building2, color: '#E9A93D' },
];

export function ModuleIcon({ icon: Icon, color, size = 22, tile = 44 }: { icon: any; color: string; size?: number; tile?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-xl border border-border bg-surface shadow-soft"
      style={{ width: tile, height: tile }}
    >
      <span className="grid place-items-center rounded-lg" style={{ background: `${color}1f`, color, width: tile * 0.72, height: tile * 0.72 }}>
        <Icon size={size} />
      </span>
    </span>
  );
}
