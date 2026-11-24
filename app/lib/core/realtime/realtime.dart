import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../data/models.dart';
import '../auth/auth_controller.dart';
import '../providers.dart';

sealed class RealtimeEvent {}

class ChatMessageEvent extends RealtimeEvent {
  ChatMessageEvent(this.message);
  final ChatMessage message;
}

class ChatTypingEvent extends RealtimeEvent {
  ChatTypingEvent(this.conversationId);
  final String conversationId;
}

class ChatReadEvent extends RealtimeEvent {
  ChatReadEvent(this.conversationId, this.readAt);
  final String conversationId;
  final DateTime readAt;
}

class ChatDeliveredEvent extends RealtimeEvent {
  ChatDeliveredEvent(this.conversationId, this.messageIds, this.at);
  final String conversationId;
  final List<String> messageIds;
  final DateTime at;
}

class NotificationEvent extends RealtimeEvent {
  NotificationEvent(this.notification);
  final AppNotification notification;
}

class ConnectedEvent extends RealtimeEvent {}

/// Live connection (WebSocket) for chat and notifications while the app is open.
/// Works without Google/FCM. Reconnects automatically after network drops.
class RealtimeService {
  RealtimeService(this._ref);

  final Ref _ref;
  io.Socket? _socket;
  final _events = StreamController<RealtimeEvent>.broadcast();

  Stream<RealtimeEvent> get events => _events.stream;
  bool get isConnected => _socket?.connected ?? false;

  Future<void> connect() async {
    if (_socket != null) return;
    final token = await _ref.read(tokenStoreProvider).accessToken;
    if (token == null) return;
    final client = _ref.read(apiClientProvider);
    final socket = io.io(
      client.serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .disableAutoConnect()
          .enableReconnection()
          .setReconnectionDelay(2000)
          .setReconnectionDelayMax(20000)
          .build(),
    );
    socket.onConnect((_) => _events.add(ConnectedEvent()));
    socket.onConnectError((error) async {
      // Token probably expired: refresh it and reconnect with the new one.
      if ('$error'.contains('unauthorized') && await client.refreshSession()) {
        final fresh = await _ref.read(tokenStoreProvider).accessToken;
        socket.auth = {'token': fresh};
      }
    });
    socket.on('chat:message', (data) => _events.add(ChatMessageEvent(ChatMessage.fromJson(_json(data)))));
    socket.on('chat:typing', (data) => _events.add(ChatTypingEvent(_json(data)['conversationId'] as String)));
    socket.on('chat:read', (data) {
      final j = _json(data);
      _events.add(ChatReadEvent(j['conversationId'] as String, DateTime.parse(j['readAt'] as String).toLocal()));
    });
    socket.on('chat:status', (data) {
      final j = _json(data);
      _events.add(ChatDeliveredEvent(
        j['conversationId'] as String,
        (j['messageIds'] as List).cast<String>(),
        DateTime.parse(j['deliveredAt'] as String).toLocal(),
      ));
    });
    socket.on('notification', (data) => _events.add(NotificationEvent(AppNotification.fromJson(_json(data)))));
    _socket = socket..connect();
  }

  void sendTyping(String conversationId) => _socket?.emit('chat:typing', {'conversationId': conversationId});

  void disconnect() {
    _socket?.dispose();
    _socket = null;
  }

  static Map<String, dynamic> _json(dynamic data) => Map<String, dynamic>.from(data as Map);
}

final realtimeProvider = Provider<RealtimeService>((ref) {
  final service = RealtimeService(ref);
  ref.listen(currentUserProvider, (previous, user) {
    if (user == null) {
      service.disconnect();
    } else if (previous?.id != user.id) {
      service
        ..disconnect()
        ..connect();
    }
  }, fireImmediately: true);
  ref.onDispose(service.disconnect);
  return service;
});

final realtimeEventsProvider = StreamProvider<RealtimeEvent>((ref) => ref.watch(realtimeProvider).events);
