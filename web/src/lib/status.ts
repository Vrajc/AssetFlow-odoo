// Central status → color mapping. Every pill in the app pulls from here.
// "Playful Enterprise" (Odoo-inspired) semantic palette:
//   teal  #21B799  available / verified / resolved / ongoing
//   blue  #5B9BD5  allocated / booking / info
//   ochre #E9A93D  pending / under-maintenance / warning
//   red   #E4585B  overdue / blocked / missing / rejected / cancelled
//   gray  #8F8F9F  retired / disposed / inactive / completed
//   plum  #714B67  primary accent (reserved / technician)
export interface PillStyle {
  label: string;
  dot: string;
  bg: string;
  text: string;
}

const make = (label: string, color: string): PillStyle => ({
  label,
  dot: color,
  bg: `${color}1f`, // ~12% tint
  text: color,
});

const TEAL = '#21B799';
const BLUE = '#5B9BD5';
const OCHRE = '#E9A93D';
const RED = '#E4585B';
const GRAY = '#8F8F9F';
const PLUM = '#714B67';

export const ASSET_STATUS: Record<string, PillStyle> = {
  AVAILABLE: make('Available', TEAL),
  ALLOCATED: make('Allocated', BLUE),
  RESERVED: make('Reserved', PLUM),
  UNDER_MAINTENANCE: make('Under Maintenance', OCHRE),
  LOST: make('Lost', RED),
  RETIRED: make('Retired', GRAY),
  DISPOSED: make('Disposed', GRAY),
};

export const BOOKING_STATUS: Record<string, PillStyle> = {
  UPCOMING: make('Upcoming', BLUE),
  ONGOING: make('Ongoing', TEAL),
  COMPLETED: make('Completed', GRAY),
  CANCELLED: make('Cancelled', RED),
};

export const MAINT_STATUS: Record<string, PillStyle> = {
  PENDING: make('Pending', OCHRE),
  APPROVED: make('Approved', BLUE),
  REJECTED: make('Rejected', RED),
  TECHNICIAN_ASSIGNED: make('Tech Assigned', PLUM),
  IN_PROGRESS: make('In Progress', BLUE),
  RESOLVED: make('Resolved', TEAL),
};

export const PRIORITY: Record<string, PillStyle> = {
  LOW: make('Low', GRAY),
  MEDIUM: make('Medium', BLUE),
  HIGH: make('High', OCHRE),
  CRITICAL: make('Critical', RED),
};

export const TRANSFER_STATUS: Record<string, PillStyle> = {
  REQUESTED: make('Requested', OCHRE),
  APPROVED: make('Approved', BLUE),
  REJECTED: make('Rejected', RED),
  COMPLETED: make('Completed', TEAL),
};

export const AUDIT_VERIFY: Record<string, PillStyle> = {
  PENDING: make('Pending', GRAY),
  VERIFIED: make('Verified', TEAL),
  MISSING: make('Missing', RED),
  DAMAGED: make('Damaged', OCHRE),
};

export const CONDITION: Record<string, PillStyle> = {
  NEW: make('New', TEAL),
  GOOD: make('Good', TEAL),
  FAIR: make('Fair', OCHRE),
  POOR: make('Poor', RED),
};
