// Central status → color mapping. Every pill in the app pulls from here.
export interface PillStyle {
  label: string;
  dot: string;
  bg: string;
  text: string;
}

const make = (label: string, color: string): PillStyle => ({
  label,
  dot: color,
  bg: `${color}1f`,
  text: color,
});

export const ASSET_STATUS: Record<string, PillStyle> = {
  AVAILABLE: make('Available', '#10B981'),
  ALLOCATED: make('Allocated', '#60A5FA'),
  RESERVED: make('Reserved', '#A78BFA'),
  UNDER_MAINTENANCE: make('Under Maintenance', '#FBBF24'),
  LOST: make('Lost', '#F87171'),
  RETIRED: make('Retired', '#9CA3AF'),
  DISPOSED: make('Disposed', '#6B7280'),
};

export const BOOKING_STATUS: Record<string, PillStyle> = {
  UPCOMING: make('Upcoming', '#60A5FA'),
  ONGOING: make('Ongoing', '#10B981'),
  COMPLETED: make('Completed', '#9CA3AF'),
  CANCELLED: make('Cancelled', '#F87171'),
};

export const MAINT_STATUS: Record<string, PillStyle> = {
  PENDING: make('Pending', '#FBBF24'),
  APPROVED: make('Approved', '#60A5FA'),
  REJECTED: make('Rejected', '#F87171'),
  TECHNICIAN_ASSIGNED: make('Tech Assigned', '#A78BFA'),
  IN_PROGRESS: make('In Progress', '#34D399'),
  RESOLVED: make('Resolved', '#10B981'),
};

export const PRIORITY: Record<string, PillStyle> = {
  LOW: make('Low', '#9CA3AF'),
  MEDIUM: make('Medium', '#60A5FA'),
  HIGH: make('High', '#FBBF24'),
  CRITICAL: make('Critical', '#F87171'),
};

export const TRANSFER_STATUS: Record<string, PillStyle> = {
  REQUESTED: make('Requested', '#FBBF24'),
  APPROVED: make('Approved', '#60A5FA'),
  REJECTED: make('Rejected', '#F87171'),
  COMPLETED: make('Completed', '#10B981'),
};

export const AUDIT_VERIFY: Record<string, PillStyle> = {
  PENDING: make('Pending', '#9CA3AF'),
  VERIFIED: make('Verified', '#10B981'),
  MISSING: make('Missing', '#F87171'),
  DAMAGED: make('Damaged', '#FBBF24'),
};

export const CONDITION: Record<string, PillStyle> = {
  NEW: make('New', '#10B981'),
  GOOD: make('Good', '#34D399'),
  FAIR: make('Fair', '#FBBF24'),
  POOR: make('Poor', '#F87171'),
};
