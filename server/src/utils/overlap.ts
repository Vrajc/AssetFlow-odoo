/**
 * Overlap check for time-slot bookings.
 * Two intervals overlap when: newStart < existingEnd AND newEnd > existingStart.
 * Back-to-back slots (10:00-11:00 after 9:00-10:00) do NOT overlap.
 */
export function intervalsOverlap(
  newStart: Date,
  newEnd: Date,
  existingStart: Date,
  existingEnd: Date,
): boolean {
  return newStart < existingEnd && newEnd > existingStart;
}
