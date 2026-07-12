import {
  LayoutDashboard, Building2, Boxes, ArrowLeftRight, CalendarClock,
  Wrench, ClipboardCheck, BarChart3, Bell,
} from 'lucide-react';
import type { Role } from './types';

export interface NavItem {
  to: string;
  label: string;
  icon: any;
  roles?: Role[]; // if set, only these roles see it
}

export const NAV: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/organization', label: 'Organization', icon: Building2, roles: ['ADMIN'] },
  { to: '/assets', label: 'Assets', icon: Boxes },
  { to: '/allocations', label: 'Allocation & Transfer', icon: ArrowLeftRight },
  { to: '/bookings', label: 'Resource Booking', icon: CalendarClock },
  { to: '/maintenance', label: 'Maintenance', icon: Wrench },
  { to: '/audits', label: 'Audit', icon: ClipboardCheck },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/notifications', label: 'Notifications', icon: Bell },
];

export function visibleNav(role?: Role): NavItem[] {
  return NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));
}
