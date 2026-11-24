import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import { AccessResolver } from '../auth/access.js';
import { AuthUser } from '../common/auth-context.js';
import { RealtimeService } from '../notifications/realtime.js';
import { ChatService } from './chat.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Live channel. Messages are SENT over REST (reliable, retry-safe) and DELIVERED here.
 * The phone connects with its access token; each user joins a private room.
 */
@WebSocketGateway({ cors: { origin: false }, maxHttpBufferSize: 16_000 })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  private readonly logger = new Logger(ChatGateway.name);
  /** Simple per-socket flood control for "typing" events. */
  private readonly lastTyping = new WeakMap<Socket, number>();

  constructor(
    private readonly access: AccessResolver,
    private readonly realtime: RealtimeService,
    private readonly chat: ChatService,
  ) {}

  afterInit(server: Server): void {
    this.realtime.attach(server);
    server.use((socket, next) => {
      const token = (socket.handshake.auth as { token?: unknown } | undefined)?.token;
      if (typeof token !== 'string') return next(new Error('unauthorized'));
      this.access
        .resolve(token)
        .then((user) => {
          if (!user) return next(new Error('unauthorized'));
          socket.data.user = user;
          next();
        })
        .catch(() => next(new Error('unauthorized')));
    });
  }

  async handleConnection(socket: Socket): Promise<void> {
    const user = socket.data.user as AuthUser | undefined;
    if (!user) {
      socket.disconnect(true);
      return;
    }
    await socket.join(RealtimeService.userRoom(user.id));
  }

  @SubscribeMessage('chat:typing')
  async typing(@ConnectedSocket() socket: Socket, @MessageBody() body: unknown): Promise<void> {
    const user = socket.data.user as AuthUser | undefined;
    const conversationId = (body as { conversationId?: unknown } | null)?.conversationId;
    if (!user || typeof conversationId !== 'string' || !UUID.test(conversationId)) return;
    const now = Date.now();
    if (now - (this.lastTyping.get(socket) ?? 0) < 1500) return;
    this.lastTyping.set(socket, now);
    const peer = await this.chat.peerOf(user, conversationId);
    if (peer) this.realtime.emitToUser(peer, 'chat:typing', { conversationId, userId: user.id });
  }
}
