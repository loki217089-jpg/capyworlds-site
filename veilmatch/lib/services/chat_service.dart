import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';

class ChatService {
  final _db = FirebaseFirestore.instance;
  final _auth = FirebaseAuth.instance;

  String get _uid => _auth.currentUser!.uid;

  Stream<List<ChatRoom>> myChatRooms() {
    return _db
        .collection('chats')
        .where(Filter.or(
          Filter('userA', isEqualTo: _uid),
          Filter('userB', isEqualTo: _uid),
        ))
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snap) =>
            snap.docs.map((doc) => ChatRoom.fromFirestore(doc, _uid)).toList());
  }

  Stream<List<ChatMessage>> messages(String chatId) {
    return _db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .orderBy('sentAt', descending: false)
        .snapshots()
        .map((snap) =>
            snap.docs.map((doc) => ChatMessage.fromFirestore(doc)).toList());
  }

  Future<void> sendMessage(String chatId, String text, {required bool isUserA}) async {
    final batch = _db.batch();

    final msgRef = _db
        .collection('chats')
        .doc(chatId)
        .collection('messages')
        .doc();

    batch.set(msgRef, {
      'senderUid': _uid,
      'text': text,
      'sentAt': FieldValue.serverTimestamp(),
      'isSystem': false,
    });

    final unreadField = isUserA ? 'unreadB' : 'unreadA';
    final chatRef = _db.collection('chats').doc(chatId);
    batch.update(chatRef, {
      'lastMessage': text,
      'messageCount': FieldValue.increment(1),
      unreadField: FieldValue.increment(1),
    });

    await batch.commit();

    // Check milestones for system messages
    final chatDoc = await chatRef.get();
    final count = chatDoc.data()?['messageCount'] ?? 0;

    if (count == 25) {
      await chatRef.collection('messages').add({
        'senderUid': 'system',
        'text': '🎉 你們已經聊了 25 則訊息！再 25 則就能解鎖完整聊天功能。',
        'sentAt': FieldValue.serverTimestamp(),
        'isSystem': true,
      });
    } else if (count == 50) {
      await chatRef.collection('messages').add({
        'senderUid': 'system',
        'text': '🔓 恭喜！聊天功能已完全解鎖！你們可以自由暢聊了。',
        'sentAt': FieldValue.serverTimestamp(),
        'isSystem': true,
      });
      await chatRef.update({'unlocked': true});
    }
  }

  Future<void> unlockChatPaid(String chatId) async {
    await _db.collection('chats').doc(chatId).update({'unlocked': true});
    await _db.collection('chats').doc(chatId).collection('messages').add({
      'senderUid': 'system',
      'text': '🔓 聊天已透過付費解鎖！你們可以自由暢聊了。',
      'sentAt': FieldValue.serverTimestamp(),
      'isSystem': true,
    });
  }

  Future<void> markRead(String chatId, bool isUserA) async {
    final field = isUserA ? 'unreadA' : 'unreadB';
    await _db.collection('chats').doc(chatId).update({field: 0});
  }
}
