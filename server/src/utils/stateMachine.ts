import { AssetStatus } from '@prisma/client';
import { conflict } from './errors';

/**
 * Allowed asset lifecycle transitions. Enforced server-side everywhere an
 * asset status changes. Any transition not listed here is rejected with 409
 * INVALID_STATE_TRANSITION.
 */
const ALLOWED: Record<AssetStatus, AssetStatus[]> = {
  AVAILABLE: ['ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED'],
  RESERVED: ['AVAILABLE', 'ALLOCATED', 'UNDER_MAINTENANCE'],
  ALLOCATED: ['AVAILABLE', 'UNDER_MAINTENANCE', 'LOST'],
  UNDER_MAINTENANCE: ['AVAILABLE', 'ALLOCATED'],
  LOST: ['AVAILABLE', 'RETIRED'],
  RETIRED: ['DISPOSED', 'AVAILABLE'],
  DISPOSED: [],
};

export function assertTransition(from: AssetStatus, to: AssetStatus): void {
  if (from === to) return;
  if (!ALLOWED[from]?.includes(to)) {
    throw conflict(
      'INVALID_STATE_TRANSITION',
      `Cannot move asset from ${from} to ${to}.`,
      { from, to, allowed: ALLOWED[from] },
    );
  }
}

export function canTransition(from: AssetStatus, to: AssetStatus): boolean {
  return from === to || Boolean(ALLOWED[from]?.includes(to));
}
