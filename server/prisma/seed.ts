import { PrismaClient, Prisma, AssetStatus, AssetCondition, Priority } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { addDays, addHours, setHours, setMinutes, startOfDay, subDays, subMonths } from 'date-fns';

const prisma = new PrismaClient();

const PASSWORD = 'Demo@123';

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: 'admin@assetflow.io' } });
  if (existing) {
    console.log('[seed] Database already seeded — skipping.');
    return;
  }

  console.log('[seed] Seeding AssetFlow demo organization...');
  const hash = await bcrypt.hash(PASSWORD, 10);

  /* ------------------------------ Departments ----------------------------- */
  const engineering = await prisma.department.create({ data: { name: 'Engineering', status: 'ACTIVE' } });
  const facilities = await prisma.department.create({ data: { name: 'Facilities', status: 'ACTIVE' } });
  const fieldOps = await prisma.department.create({ data: { name: 'Field Ops', status: 'ACTIVE' } });
  const fieldOpsEast = await prisma.department.create({ data: { name: 'Field Ops (East)', status: 'INACTIVE', parentId: fieldOps.id } });
  const hr = await prisma.department.create({ data: { name: 'HR', status: 'ACTIVE' } });

  /* ------------------------------- Categories ----------------------------- */
  const electronics = await prisma.assetCategory.create({
    data: { name: 'Electronics', customFields: [{ key: 'warrantyMonths', label: 'Warranty (months)', type: 'number' }] as Prisma.InputJsonValue },
  });
  const furniture = await prisma.assetCategory.create({ data: { name: 'Furniture' } });
  const vehicles = await prisma.assetCategory.create({
    data: { name: 'Vehicles', customFields: [{ key: 'plate', label: 'License Plate', type: 'text' }] as Prisma.InputJsonValue },
  });
  const equipment = await prisma.assetCategory.create({ data: { name: 'Equipment' } });
  const rooms = await prisma.assetCategory.create({ data: { name: 'Rooms' } });

  /* --------------------------------- Users -------------------------------- */
  const admin = await prisma.user.create({ data: { name: 'Admin User', email: 'admin@assetflow.io', passwordHash: hash, role: 'ADMIN', departmentId: hr.id } });
  const meera = await prisma.user.create({ data: { name: 'Meera Iyer', email: 'meera@assetflow.io', passwordHash: hash, role: 'ASSET_MANAGER', departmentId: facilities.id } });
  const aditi = await prisma.user.create({ data: { name: 'Aditi Rao', email: 'aditi@assetflow.io', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: engineering.id } });
  const rohan = await prisma.user.create({ data: { name: 'Rohan Mehta', email: 'rohan@assetflow.io', passwordHash: hash, role: 'DEPARTMENT_HEAD', departmentId: facilities.id } });
  const priya = await prisma.user.create({ data: { name: 'Priya Shah', email: 'priya@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: engineering.id } });
  const raj = await prisma.user.create({ data: { name: 'Raj Kapoor', email: 'raj@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: engineering.id } });
  const arjun = await prisma.user.create({ data: { name: 'Arjun Nair', email: 'arjun@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: fieldOps.id } });
  const sana = await prisma.user.create({ data: { name: 'Sana Iqbal', email: 'sana@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: fieldOps.id } });
  const dev = await prisma.user.create({ data: { name: 'Dev Sharma', email: 'dev@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: engineering.id } });
  const nina = await prisma.user.create({ data: { name: 'Nina Patel', email: 'nina@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: hr.id } });
  const karan = await prisma.user.create({ data: { name: 'Karan Bose', email: 'karan@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: facilities.id } });
  const zoya = await prisma.user.create({ data: { name: 'Zoya Khan', email: 'zoya@assetflow.io', passwordHash: hash, role: 'EMPLOYEE', departmentId: fieldOps.id } });

  // Assign department heads.
  await prisma.department.update({ where: { id: engineering.id }, data: { headId: aditi.id } });
  await prisma.department.update({ where: { id: facilities.id }, data: { headId: rohan.id } });
  await prisma.department.update({ where: { id: fieldOps.id }, data: { headId: sana.id } });

  const employees = [priya, raj, arjun, sana, dev, nina, karan, zoya];

  /* --------------------------------- Assets ------------------------------- */
  // Helper: create asset with an explicit tag number.
  let tagCounter = 0;
  async function asset(
    tagNum: number,
    name: string,
    categoryId: string,
    opts: Partial<{
      status: AssetStatus; condition: AssetCondition; location: string; departmentId: string;
      isBookable: boolean; serialNumber: string; acquisitionDate: Date; acquisitionCost: number;
      customFieldValues: Prisma.InputJsonValue;
    }> = {},
  ) {
    tagCounter = Math.max(tagCounter, tagNum);
    return prisma.asset.create({
      data: {
        assetTag: `AF-${String(tagNum).padStart(4, '0')}`,
        name,
        categoryId,
        status: opts.status ?? 'AVAILABLE',
        condition: opts.condition ?? 'GOOD',
        location: opts.location ?? 'HQ',
        departmentId: opts.departmentId,
        isBookable: opts.isBookable ?? false,
        serialNumber: opts.serialNumber,
        acquisitionDate: opts.acquisitionDate,
        acquisitionCost: opts.acquisitionCost as unknown as Prisma.Decimal,
        customFieldValues: opts.customFieldValues,
      },
    });
  }

  const now = new Date();
  const yearsAgo = (y: number) => subDays(now, 365 * y);

  // Star of the show: Priya's laptop AF-0114.
  const laptop0114 = await asset(114, 'Dell Laptop', electronics.id, { status: 'ALLOCATED', condition: 'GOOD', location: 'Bengaluru', departmentId: engineering.id, serialNumber: 'DL-5590-114', acquisitionDate: yearsAgo(2), acquisitionCost: 82000, customFieldValues: { warrantyMonths: 24 } });

  // Bookable resources.
  const roomB2 = await asset(200, 'Conference Room B2', rooms.id, { isBookable: true, location: 'HQ Floor 2', departmentId: facilities.id });
  const roomA1 = await asset(210, 'Conference Room A1', rooms.id, { isBookable: true, location: 'HQ Floor 1', departmentId: facilities.id });
  const projector62 = await asset(62, 'Projector', electronics.id, { status: 'AVAILABLE', isBookable: true, location: 'HQ Floor 2', departmentId: facilities.id, acquisitionDate: yearsAgo(1), acquisitionCost: 35000, customFieldValues: { warrantyMonths: 12 } });
  const van343 = await asset(343, 'Delivery Van', vehicles.id, { isBookable: true, location: 'Depot', departmentId: fieldOps.id, acquisitionDate: yearsAgo(3), acquisitionCost: 950000, customFieldValues: { plate: 'KA-01-AB-3434' } });

  // Directory-style rows from wireframe.
  const chair201 = await asset(201, 'Office Chair', furniture.id, { status: 'AVAILABLE', location: 'Warehouse', departmentId: hr.id, acquisitionCost: 6500 });
  const laptop12 = await asset(12, 'Dell Laptop', electronics.id, { status: 'ALLOCATED', location: 'Bengaluru', departmentId: engineering.id, acquisitionDate: yearsAgo(1), acquisitionCost: 78000, customFieldValues: { warrantyMonths: 24 } });

  // Bulk fleet across statuses.
  const monitors: any[] = [];
  for (let i = 0; i < 6; i++) monitors.push(await asset(700 + i, `Monitor ${i + 1}`, electronics.id, { status: i % 3 === 0 ? 'ALLOCATED' : 'AVAILABLE', location: `Desk E1${i}`, departmentId: engineering.id, acquisitionDate: yearsAgo(i % 5), acquisitionCost: 15000 }));
  const desks: any[] = [];
  for (let i = 0; i < 5; i++) desks.push(await asset(400 + i, `Standing Desk ${i + 1}`, furniture.id, { status: 'AVAILABLE', location: `Desk E1${i}`, departmentId: engineering.id, acquisitionCost: 22000 }));

  const forklift = await asset(87, 'Forklift', equipment.id, { status: 'AVAILABLE', condition: 'FAIR', location: 'Warehouse', departmentId: fieldOps.id, acquisitionDate: yearsAgo(3), acquisitionCost: 1200000 });
  const printer78 = await asset(78, 'Printer Jam Unit', electronics.id, { status: 'UNDER_MAINTENANCE', location: 'HQ Floor 1', departmentId: facilities.id, acquisitionDate: yearsAgo(2), acquisitionCost: 28000, customFieldValues: { warrantyMonths: 12 } });
  const ac003 = await asset(3, 'AC Unit', equipment.id, { status: 'UNDER_MAINTENANCE', condition: 'FAIR', location: 'HQ Floor 2', departmentId: facilities.id });
  const camera301 = await asset(301, 'DSLR Camera', electronics.id, { status: 'AVAILABLE', condition: 'GOOD', location: 'Store Room', departmentId: fieldOps.id, acquisitionDate: yearsAgo(2), acquisitionCost: 65000 });
  const chair410 = await asset(410, 'Ergonomic Chair', furniture.id, { status: 'AVAILABLE', location: 'Warehouse', departmentId: hr.id, acquisitionCost: 9000 });
  const oldLaptop20 = await asset(20, 'Legacy Laptop', electronics.id, { status: 'AVAILABLE', condition: 'POOR', location: 'Store Room', departmentId: engineering.id, acquisitionDate: yearsAgo(5), acquisitionCost: 45000 });
  const scanner = await asset(88, 'Barcode Scanner', equipment.id, { status: 'AVAILABLE', condition: 'FAIR', location: 'Warehouse', departmentId: fieldOps.id });
  const retiredServer = await asset(500, 'Legacy Server', electronics.id, { status: 'RETIRED', condition: 'POOR', location: 'Data Closet', departmentId: engineering.id, acquisitionDate: yearsAgo(6), acquisitionCost: 300000 });
  const disposedPhone = await asset(501, 'Old Handset', electronics.id, { status: 'DISPOSED', condition: 'POOR', location: 'Store Room' });
  const lostTablet = await asset(502, 'Field Tablet', electronics.id, { status: 'LOST', condition: 'GOOD', location: 'Field', departmentId: fieldOps.id, acquisitionCost: 40000 });

  // A few more available assets to round out ~40.
  for (let i = 0; i < 6; i++) await asset(600 + i, `Toolkit ${i + 1}`, equipment.id, { status: 'AVAILABLE', location: 'Workshop', departmentId: fieldOps.id, acquisitionCost: 5000 });

  // Advance the auto-increment counter past all explicit tags.
  await prisma.counter.upsert({ where: { id: 'asset_tag' }, create: { id: 'asset_tag', value: tagCounter }, update: { value: tagCounter } });

  /* ------------------------------ Allocations ----------------------------- */
  // Priya holds AF-0114 (active).
  await prisma.allocation.create({ data: { assetId: laptop0114.id, allocatedToId: priya.id, departmentId: engineering.id, allocatedAt: subDays(now, 20), expectedReturnDate: addDays(now, 15) } });
  // A returned history entry for AF-0114.
  await prisma.allocation.create({ data: { assetId: laptop0114.id, allocatedToId: arjun.id, allocatedAt: subDays(now, 90), returnedAt: subDays(now, 60), status: 'RETURNED', checkInCondition: 'GOOD', checkInNotes: 'Returned in good condition' } });

  await prisma.allocation.create({ data: { assetId: laptop12.id, allocatedToId: dev.id, departmentId: engineering.id, allocatedAt: subDays(now, 10), expectedReturnDate: addDays(now, 20) } });
  await prisma.allocation.create({ data: { assetId: monitors[0].id, allocatedToId: raj.id, allocatedAt: subDays(now, 5), expectedReturnDate: addDays(now, 25) } });

  // 3 OVERDUE allocations (past expected return date).
  await prisma.allocation.create({ data: { assetId: monitors[3].id, allocatedToId: nina.id, allocatedAt: subDays(now, 40), expectedReturnDate: subDays(now, 3), status: 'OVERDUE' } });
  const overdueChairAsset = await asset(21, 'Task Chair', furniture.id, { status: 'ALLOCATED', location: 'HQ', departmentId: hr.id });
  await prisma.allocation.create({ data: { assetId: overdueChairAsset.id, allocatedToId: karan.id, allocatedAt: subDays(now, 30), expectedReturnDate: subDays(now, 3), status: 'OVERDUE' } });
  const overdueCam = await asset(33, 'Site Camera', electronics.id, { status: 'ALLOCATED', location: 'Field', departmentId: fieldOps.id });
  await prisma.allocation.create({ data: { assetId: overdueCam.id, allocatedToId: zoya.id, allocatedAt: subDays(now, 25), expectedReturnDate: subDays(now, 5), status: 'OVERDUE' } });

  /* ------------------------------- Bookings ------------------------------- */
  const today9 = setMinutes(setHours(startOfDay(now), 9), 0);
  const today10 = setHours(today9, 10);
  // Room B2 booked 9:00-10:00 today (so a 9:30-10:30 attempt on stage is rejected).
  await prisma.booking.create({ data: { resourceId: roomB2.id, bookedById: meera.id, startTime: today9, endTime: today10, purpose: 'Procurement Team standup', status: 'UPCOMING' } });
  await prisma.booking.create({ data: { resourceId: roomB2.id, bookedById: aditi.id, startTime: setHours(today9, 14), endTime: setHours(today9, 15), purpose: 'Design review', status: 'UPCOMING' } });
  await prisma.booking.create({ data: { resourceId: roomA1.id, bookedById: priya.id, startTime: setHours(today9, 11), endTime: setHours(today9, 12), purpose: '1:1', status: 'UPCOMING' } });
  await prisma.booking.create({ data: { resourceId: projector62.id, bookedById: dev.id, startTime: addDays(setHours(today9, 10), 1), endTime: addDays(setHours(today9, 12), 1), purpose: 'Client demo', status: 'UPCOMING' } });
  await prisma.booking.create({ data: { resourceId: van343.id, bookedById: arjun.id, startTime: subDays(setHours(today9, 8), 1), endTime: subDays(setHours(today9, 17), 1), purpose: 'East route delivery', status: 'COMPLETED' } });
  // Spread bookings for a lively heatmap.
  for (let d = 1; d <= 5; d++) {
    for (const h of [9, 11, 14, 16]) {
      if (Math.random() > 0.4) {
        await prisma.booking.create({ data: { resourceId: [roomB2.id, roomA1.id, projector62.id][h % 3], bookedById: employees[h % employees.length].id, startTime: addDays(setHours(today9, h), -d), endTime: addDays(setHours(today9, h + 1), -d), purpose: 'Meeting', status: 'COMPLETED' } });
      }
    }
  }

  /* ------------------------------ Maintenance ----------------------------- */
  // Spread across all 5 kanban columns (matches wireframe Screen 7).
  await prisma.maintenanceRequest.create({ data: { assetId: projector62.id, raisedById: dev.id, issue: 'Projector bulb not turning on', priority: 'HIGH', status: 'PENDING' } });
  await prisma.maintenanceRequest.create({ data: { assetId: ac003.id, raisedById: karan.id, issue: 'AC unit making noise / not cooling', priority: 'MEDIUM', status: 'APPROVED', decidedById: meera.id } });
  await prisma.maintenanceRequest.create({ data: { assetId: printer78.id, raisedById: nina.id, issue: 'Printer paper jam, rollers worn', priority: 'MEDIUM', status: 'TECHNICIAN_ASSIGNED', decidedById: meera.id, technicianName: 'R. Verma' } });
  const inProgressAsset = await asset(847, 'Office Printer', electronics.id, { status: 'UNDER_MAINTENANCE', location: 'HQ Floor 1', departmentId: facilities.id });
  await prisma.maintenanceRequest.create({ data: { assetId: inProgressAsset.id, raisedById: karan.id, issue: 'Printer jam, parts ordered', priority: 'HIGH', status: 'IN_PROGRESS', decidedById: meera.id, technicianName: 'S. Menon' } });
  await prisma.maintenanceRequest.create({ data: { assetId: forklift.id, raisedById: arjun.id, issue: 'Chair repair / hydraulics resolved', priority: 'LOW', status: 'RESOLVED', decidedById: meera.id, technicianName: 'K. Das', resolutionNotes: 'Replaced hydraulic seal', resolvedAt: subDays(now, 5) } });

  /* --------------------------------- Audits ------------------------------- */
  // Open cycle mid-progress (Engineering).
  const openCycle = await prisma.auditCycle.create({
    data: {
      name: 'Q3 Audit: Engineering Dept', scopeDepartmentId: engineering.id, startDate: subDays(now, 2), endDate: addDays(now, 12), createdById: admin.id,
      auditors: { create: [{ auditorId: aditi.id }, { auditorId: sana.id }] },
    },
  });
  const engAssets = await prisma.asset.findMany({ where: { departmentId: engineering.id, status: { notIn: ['DISPOSED', 'RETIRED'] } } });
  for (let i = 0; i < engAssets.length; i++) {
    const a = engAssets[i];
    const verification = i === 0 ? 'MISSING' : i === 1 ? 'DAMAGED' : i < 5 ? 'VERIFIED' : 'PENDING';
    await prisma.auditItem.create({ data: { cycleId: openCycle.id, assetId: a.id, expectedLocation: a.location, verification: verification as any, verifiedById: verification === 'PENDING' ? null : aditi.id, verifiedAt: verification === 'PENDING' ? null : now, notes: verification === 'DAMAGED' ? 'Cracked screen' : verification === 'MISSING' ? 'Not at desk' : null } });
  }

  // Closed cycle with a discrepancy history (Facilities).
  const closedCycle = await prisma.auditCycle.create({
    data: {
      name: 'Q2 Audit: Facilities', scopeDepartmentId: facilities.id, startDate: subMonths(now, 3), endDate: subMonths(now, 2), status: 'CLOSED', closedAt: subMonths(now, 2), createdById: admin.id,
      auditors: { create: [{ auditorId: rohan.id }] },
    },
  });
  const facAssets = await prisma.asset.findMany({ where: { departmentId: facilities.id }, take: 6 });
  for (let i = 0; i < facAssets.length; i++) {
    await prisma.auditItem.create({ data: { cycleId: closedCycle.id, assetId: facAssets[i].id, expectedLocation: facAssets[i].location, verification: i === 0 ? 'DAMAGED' : 'VERIFIED', verifiedById: rohan.id, verifiedAt: subMonths(now, 2), notes: i === 0 ? 'Scuffed casing' : null } });
  }

  /* ------------------------ Transfers & Notifications --------------------- */
  await prisma.transferRequest.create({ data: { assetId: laptop12.id, fromUserId: dev.id, toUserId: raj.id, requestedById: raj.id, reason: 'Dev rotating off project; Raj taking over.', status: 'REQUESTED' } });

  await prisma.notification.createMany({
    data: [
      { userId: priya.id, type: 'ASSET_ASSIGNED', title: 'Asset assigned', body: 'Laptop AF-0114 assigned to you', link: '/assets/AF-0114' },
      { userId: meera.id, type: 'MAINTENANCE_UPDATE', title: 'Maintenance request', body: 'Maintenance request pending approval', link: '/maintenance' },
      { userId: aditi.id, type: 'BOOKING_UPDATE', title: 'Booking confirmed', body: 'Room B2 : 9:00 to 10:00', link: '/bookings' },
      { userId: raj.id, type: 'TRANSFER_UPDATE', title: 'Transfer requested', body: 'Transfer request submitted for AF-0012', link: '/allocations' },
      { userId: nina.id, type: 'OVERDUE_RETURN', title: 'Overdue return', body: 'Monitor is 3 days overdue', link: '/allocations?overdue=true' },
      { userId: admin.id, type: 'AUDIT_DISCREPANCY', title: 'Audit discrepancy', body: 'Discrepancy flagged in Q3 Engineering audit', link: `/audits/${openCycle.id}` },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      { actorId: meera.id, action: 'ASSET_ALLOCATED', entityType: 'Asset', entityId: laptop0114.id, metadata: { assetTag: 'AF-0114', to: 'Priya Shah' } },
      { actorId: aditi.id, action: 'BOOKING_CREATED', entityType: 'Booking', entityId: roomB2.id, metadata: { resource: 'Conference Room B2' } },
      { actorId: meera.id, action: 'MAINTENANCE_RESOLVED', entityType: 'Asset', entityId: forklift.id, metadata: { assetTag: 'AF-0087' } },
    ],
  });

  console.log('[seed] Done. Demo accounts created — use the one-click demo buttons on the sign-in screen.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
