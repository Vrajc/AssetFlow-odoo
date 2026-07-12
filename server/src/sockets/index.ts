import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

let io: SocketServer | null = null;

interface SocketUser {
  id: string;
  role: string;
}

export function initSockets(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: { origin: env.WEB_ORIGIN, credentials: true },
  });

  io.use((socket: Socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      (socket.handshake.headers?.authorization || '').replace('Bearer ', '');
    if (!token) return next(new Error('No auth token'));
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as SocketUser;
      (socket.data as { user: SocketUser }).user = { id: payload.id, role: payload.role };
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = (socket.data as { user: SocketUser }).user;
    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
    socket.join('broadcast');

    socket.on('disconnect', () => {
      /* rooms auto-cleaned */
    });
  });

  return io;
}

function emit(target: string, event: string, payload: unknown) {
  if (!io) return;
  io.to(target).emit(event, payload);
}

/** Emit an event to a single user's room. */
export const emitToUser = (userId: string, event: string, payload: unknown) =>
  emit(`user:${userId}`, event, payload);

/** Emit an event to everyone with a given role. */
export const emitToRole = (role: string, event: string, payload: unknown) =>
  emit(`role:${role}`, event, payload);

/** Emit an event to every connected client. */
export const emitBroadcast = (event: string, payload: unknown) =>
  emit('broadcast', event, payload);

/** Managers (admin + asset manager) — used for approval-queue style events. */
export const emitToManagers = (event: string, payload: unknown) => {
  emit('role:ADMIN', event, payload);
  emit('role:ASSET_MANAGER', event, payload);
};
