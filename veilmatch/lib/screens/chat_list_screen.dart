import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/chat_service.dart';
import '../models/user_model.dart';
import '../widgets/anonymous_avatar.dart';

class ChatListScreen extends StatelessWidget {
  const ChatListScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final chatService = ChatService();

    return SafeArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
            child: Text('聊天', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: cs.primary)),
          ),
          Expanded(
            child: StreamBuilder<List<ChatRoom>>(
              stream: chatService.myChatRooms(),
              builder: (context, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final rooms = snap.data ?? [];
                if (rooms.isEmpty) {
                  return Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(Icons.chat_bubble_outline, size: 56, color: cs.onSurface.withValues(alpha: 0.2)),
                        const SizedBox(height: 12),
                        Text('還沒有聊天', style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5))),
                        const SizedBox(height: 4),
                        Text('去探索頁面配對吧！', style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.4))),
                      ],
                    ),
                  );
                }
                return ListView.builder(
                  itemCount: rooms.length,
                  padding: const EdgeInsets.symmetric(horizontal: 12),
                  itemBuilder: (context, i) {
                    final room = rooms[i];
                    final progress = (room.messageCount / 50).clamp(0.0, 1.0);
                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: AnonymousAvatar(shapeIndex: room.theirAvatarIndex, colorIndex: 0, size: 48),
                        title: Row(
                          children: [
                            Expanded(child: Text(room.theirNickname, overflow: TextOverflow.ellipsis)),
                            if (room.unreadCount > 0)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                decoration: BoxDecoration(color: cs.primary, borderRadius: BorderRadius.circular(10)),
                                child: Text('${room.unreadCount}', style: const TextStyle(color: Colors.white, fontSize: 12)),
                              ),
                          ],
                        ),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            if (room.lastMessage.isNotEmpty)
                              Text(room.lastMessage, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13)),
                            const SizedBox(height: 4),
                            if (!room.unlocked)
                              ClipRRect(
                                borderRadius: BorderRadius.circular(4),
                                child: LinearProgressIndicator(
                                  value: progress,
                                  minHeight: 4,
                                  backgroundColor: cs.onSurface.withValues(alpha: 0.1),
                                  valueColor: AlwaysStoppedAnimation(cs.primary),
                                ),
                              ),
                            if (room.unlocked)
                              Row(
                                children: [
                                  Icon(Icons.lock_open, size: 12, color: cs.primary),
                                  const SizedBox(width: 4),
                                  Text('已解鎖', style: TextStyle(fontSize: 11, color: cs.primary)),
                                ],
                              ),
                          ],
                        ),
                        onTap: () => context.go('/chats/${room.id}'),
                      ),
                    );
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
