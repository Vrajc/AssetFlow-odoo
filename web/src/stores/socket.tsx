import { createContext, useContext, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { API_URL } from '../api/client';
import { useAuth } from './auth';

const SocketCtx = createContext<Socket | null>(null);
export const useSocket = () => useContext(SocketCtx);

/**
 * Connects to the realtime layer and invalidates react-query caches on events.
 * This is what makes two browser windows update each other instantly.
 */
export function SocketProvider({ children }: { children: React.ReactNode }) {
  const token = useAuth((s) => s.token);
  const qc = useQueryClient();
  const ref = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token) return;
    const socket = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    ref.current = socket;

    const invalidate = (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));

    socket.on('notification:new', (n: { title: string; body: string }) => {
      invalidate('notifications');
      toast.success(`${n.title}`, { icon: '🔔' });
    });
    socket.on('kpi:refresh', () => invalidate('kpis', 'overdue', 'dashboard'));
    socket.on('asset:updated', () => invalidate('assets', 'asset', 'kpis'));
    socket.on('maintenance:updated', () => invalidate('maintenance', 'kpis'));
    socket.on('booking:updated', () => invalidate('resource-bookings', 'my-bookings', 'kpis'));
    socket.on('transfer:updated', () => invalidate('transfers', 'allocations', 'kpis'));
    socket.on('audit:progress', () => invalidate('audit-cycle', 'audit-cycles'));
    socket.on('activity:new', () => invalidate('activity', 'dashboard'));

    return () => {
      socket.disconnect();
      ref.current = null;
    };
  }, [token, qc]);

  return <SocketCtx.Provider value={ref.current}>{children}</SocketCtx.Provider>;
}
