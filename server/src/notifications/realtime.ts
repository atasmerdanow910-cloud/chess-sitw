import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

/** Holds the Socket.IO server so any service can push live events to a user's devices. */
@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  attach(server: Server): void {
    this.server = server;
  }

  static userRoom(userId: string): string {
    return `user:${userId}`;
  }

  emitToUser(userId: string, event: string, payload: unknown): void {
    this.server?.to(RealtimeService.userRoom(userId)).emit(event, payload);
  }

  /** Closes live connections of a user (e.g. after blocking). */
  disconnectUser(userId: string): void {
    this.server?.in(RealtimeService.userRoom(userId)).disconnectSockets(true);
  }

  async isOnline(userId: string): Promise<boolean> {
    if (!this.server) return false;
    const sockets = await this.server.in(RealtimeService.userRoom(userId)).fetchSockets();
    return sockets.length > 0;
  }
}
