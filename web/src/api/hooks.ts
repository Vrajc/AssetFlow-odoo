import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import type { Asset, Category, Department, User } from '../lib/types';

const get = <T,>(url: string) => api.get<T>(url).then((r) => r.data);

/* --------------------------------- Org ------------------------------------ */
export const useDepartments = () => useQuery({ queryKey: ['departments'], queryFn: () => get<Department[]>('/departments') });
export const useCategories = () => useQuery({ queryKey: ['categories'], queryFn: () => get<Category[]>('/categories') });
export const useUsers = (params?: Record<string, string>) =>
  useQuery({ queryKey: ['users', params], queryFn: () => get<User[]>(`/users?${new URLSearchParams(params).toString()}`) });

export function useOrgMutations() {
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ['departments'] }); qc.invalidateQueries({ queryKey: ['categories'] }); qc.invalidateQueries({ queryKey: ['users'] }); };
  return {
    createDept: useMutation({ mutationFn: (b: any) => api.post('/departments', b), onSuccess: inv }),
    updateDept: useMutation({ mutationFn: ({ id, ...b }: any) => api.patch(`/departments/${id}`, b), onSuccess: inv }),
    createCategory: useMutation({ mutationFn: (b: any) => api.post('/categories', b), onSuccess: inv }),
    updateCategory: useMutation({ mutationFn: ({ id, ...b }: any) => api.patch(`/categories/${id}`, b), onSuccess: inv }),
    deleteCategory: useMutation({ mutationFn: (id: string) => api.delete(`/categories/${id}`), onSuccess: inv }),
    setRole: useMutation({ mutationFn: ({ id, role }: any) => api.patch(`/users/${id}/role`, { role }), onSuccess: inv }),
    setStatus: useMutation({ mutationFn: ({ id, status }: any) => api.patch(`/users/${id}/status`, { status }), onSuccess: inv }),
    setDept: useMutation({ mutationFn: ({ id, departmentId }: any) => api.patch(`/users/${id}/department`, { departmentId }), onSuccess: inv }),
  };
}

/* -------------------------------- Assets ---------------------------------- */
export const useAssets = (params: Record<string, any>) =>
  useQuery({ queryKey: ['assets', params], queryFn: () => get<{ items: Asset[]; total: number; totalPages: number; page: number }>(`/assets?${new URLSearchParams(Object.entries(params).filter(([, v]) => v !== '' && v != null) as any).toString()}`) });
export const useAsset = (id?: string) => useQuery({ queryKey: ['asset', id], queryFn: () => get<any>(`/assets/${id}`), enabled: !!id });

export function useAssetMutations() {
  const qc = useQueryClient();
  const inv = () => { qc.invalidateQueries({ queryKey: ['assets'] }); qc.invalidateQueries({ queryKey: ['asset'] }); qc.invalidateQueries({ queryKey: ['kpis'] }); };
  return {
    create: useMutation({ mutationFn: (b: any) => api.post('/assets', b).then((r) => r.data), onSuccess: inv }),
    update: useMutation({ mutationFn: ({ id, ...b }: any) => api.patch(`/assets/${id}`, b), onSuccess: inv }),
    retire: useMutation({ mutationFn: (id: string) => api.post(`/assets/${id}/retire`), onSuccess: inv }),
    dispose: useMutation({ mutationFn: (id: string) => api.post(`/assets/${id}/dispose`), onSuccess: inv }),
  };
}

/* ----------------------------- Allocations -------------------------------- */
export const useAllocations = (params?: Record<string, string>) =>
  useQuery({ queryKey: ['allocations', params], queryFn: () => get<any[]>(`/allocations?${new URLSearchParams(params).toString()}`) });
export const useTransfers = (status?: string) =>
  useQuery({ queryKey: ['transfers', status], queryFn: () => get<any[]>(`/transfers${status ? `?status=${status}` : ''}`) });

export function useAllocationMutations() {
  const qc = useQueryClient();
  const inv = () => { ['allocations', 'transfers', 'assets', 'asset', 'kpis'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  return {
    allocate: useMutation({ mutationFn: (b: any) => api.post('/allocations', b).then((r) => r.data), onSuccess: inv }),
    returnAsset: useMutation({ mutationFn: ({ id, ...b }: any) => api.post(`/allocations/${id}/return`, b), onSuccess: inv }),
    requestTransfer: useMutation({ mutationFn: (b: any) => api.post('/transfers', b).then((r) => r.data), onSuccess: inv }),
    approveTransfer: useMutation({ mutationFn: (id: string) => api.post(`/transfers/${id}/approve`), onSuccess: inv }),
    rejectTransfer: useMutation({ mutationFn: ({ id, reason }: any) => api.post(`/transfers/${id}/reject`, { reason }), onSuccess: inv }),
  };
}

/* ------------------------------- Bookings --------------------------------- */
export const useResources = () => useQuery({ queryKey: ['resources'], queryFn: () => get<any[]>('/resources') });
export const useResourceBookings = (id?: string, from?: string, to?: string) =>
  useQuery({ queryKey: ['resource-bookings', id, from, to], queryFn: () => get<any[]>(`/resources/${id}/bookings?from=${from ?? ''}&to=${to ?? ''}`), enabled: !!id });
export const useMyBookings = () => useQuery({ queryKey: ['my-bookings'], queryFn: () => get<any[]>('/bookings/mine') });

export function useBookingMutations() {
  const qc = useQueryClient();
  const inv = () => { ['resource-bookings', 'my-bookings', 'kpis'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  return {
    create: useMutation({ mutationFn: (b: any) => api.post('/bookings', b).then((r) => r.data), onSuccess: inv }),
    cancel: useMutation({ mutationFn: (id: string) => api.patch(`/bookings/${id}/cancel`), onSuccess: inv }),
    reschedule: useMutation({ mutationFn: ({ id, ...b }: any) => api.patch(`/bookings/${id}/reschedule`, b), onSuccess: inv }),
  };
}

/* ------------------------------ Maintenance ------------------------------- */
export const useMaintenance = () => useQuery({ queryKey: ['maintenance'], queryFn: () => get<{ board: Record<string, any[]>; items: any[] }>('/maintenance') });

export function useMaintenanceMutations() {
  const qc = useQueryClient();
  const inv = () => { ['maintenance', 'assets', 'kpis'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  return {
    raise: useMutation({ mutationFn: (b: any) => api.post('/maintenance', b), onSuccess: inv }),
    move: useMutation({ mutationFn: ({ id, ...b }: any) => api.post(`/maintenance/${id}/move`, b), onSuccess: inv }),
    approve: useMutation({ mutationFn: (id: string) => api.post(`/maintenance/${id}/approve`), onSuccess: inv }),
    reject: useMutation({ mutationFn: ({ id, reason }: any) => api.post(`/maintenance/${id}/reject`, { reason }), onSuccess: inv }),
    assign: useMutation({ mutationFn: ({ id, technicianName }: any) => api.post(`/maintenance/${id}/assign-technician`, { technicianName }), onSuccess: inv }),
    start: useMutation({ mutationFn: (id: string) => api.post(`/maintenance/${id}/start`), onSuccess: inv }),
    resolve: useMutation({ mutationFn: ({ id, notes }: any) => api.post(`/maintenance/${id}/resolve`, { notes }), onSuccess: inv }),
  };
}

/* -------------------------------- Audits ---------------------------------- */
export const useAuditCycles = () => useQuery({ queryKey: ['audit-cycles'], queryFn: () => get<any[]>('/audit-cycles') });
export const useAuditCycle = (id?: string) => useQuery({ queryKey: ['audit-cycle', id], queryFn: () => get<any>(`/audit-cycles/${id}`), enabled: !!id });
export const useDiscrepancyReport = (id?: string) => useQuery({ queryKey: ['discrepancy', id], queryFn: () => get<any>(`/audit-cycles/${id}/discrepancy-report`), enabled: !!id });

export function useAuditMutations() {
  const qc = useQueryClient();
  const inv = () => { ['audit-cycles', 'audit-cycle', 'discrepancy', 'assets', 'kpis'].forEach((k) => qc.invalidateQueries({ queryKey: [k] })); };
  return {
    create: useMutation({ mutationFn: (b: any) => api.post('/audit-cycles', b).then((r) => r.data), onSuccess: inv }),
    mark: useMutation({ mutationFn: ({ id, ...b }: any) => api.patch(`/audit-items/${id}`, b), onSuccess: inv }),
    markByTag: useMutation({ mutationFn: ({ cycleId, ...b }: any) => api.post(`/audit-cycles/${cycleId}/mark-by-tag`, b), onSuccess: inv }),
    close: useMutation({ mutationFn: (id: string) => api.post(`/audit-cycles/${id}/close`).then((r) => r.data), onSuccess: inv }),
  };
}

/* -------------------------------- Reports --------------------------------- */
export const useKpis = () => useQuery({ queryKey: ['kpis'], queryFn: () => get<any>('/reports/kpis'), refetchInterval: 30000 });
export const useOverdue = () => useQuery({ queryKey: ['overdue'], queryFn: () => get<any[]>('/reports/overdue') });
export const useUtilization = (groupBy: string) => useQuery({ queryKey: ['utilization', groupBy], queryFn: () => get<any[]>(`/reports/utilization?groupBy=${groupBy}`) });
export const useMaintFreq = () => useQuery({ queryKey: ['maint-freq'], queryFn: () => get<any>('/reports/maintenance-frequency') });
export const useMostUsedIdle = () => useQuery({ queryKey: ['most-used-idle'], queryFn: () => get<any>('/reports/most-used-idle') });
export const useDueSoon = () => useQuery({ queryKey: ['due-soon'], queryFn: () => get<any>('/reports/due-soon') });
export const useHeatmap = () => useQuery({ queryKey: ['heatmap'], queryFn: () => get<{ grid: number[][] }>('/reports/booking-heatmap') });
export const useDeptAllocation = () => useQuery({ queryKey: ['dept-alloc'], queryFn: () => get<any[]>('/reports/dept-allocation') });

/* ------------------------- Notifications & Activity ----------------------- */
export const useNotifications = () => useQuery({ queryKey: ['notifications'], queryFn: () => get<{ items: any[]; unread: number }>('/notifications'), refetchInterval: 60000 });
export const useActivity = (params?: Record<string, string>) =>
  useQuery({ queryKey: ['activity', params], queryFn: () => get<any[]>(`/activity-logs?${new URLSearchParams(params).toString()}`) });

export function useNotificationMutations() {
  const qc = useQueryClient();
  const inv = () => qc.invalidateQueries({ queryKey: ['notifications'] });
  return {
    markRead: useMutation({ mutationFn: (id: string) => api.patch(`/notifications/${id}/read`), onSuccess: inv }),
    markAll: useMutation({ mutationFn: () => api.patch('/notifications/read-all'), onSuccess: inv }),
  };
}
