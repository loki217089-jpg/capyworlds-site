import 'package:cloud_firestore/cloud_firestore.dart';

enum UserPlan { free, accelerate, unlimited }

enum ItemType { superLike, matchBoost, seeWhoLiked, unlockChat, extraLikes, subscription }

class UserModel {
  final String uid;
  final String anonymousId;
  final String nickname;
  final String bio;
  final int avatarIndex;
  final int avatarColorIndex;
  final List<String> tags;
  final UserPlan plan;
  final int dailyLikesUsed;
  final int dailyLikesLimit;
  final int activeChatCount;

  UserModel({
    required this.uid,
    required this.anonymousId,
    required this.nickname,
    this.bio = '',
    this.avatarIndex = 0,
    this.avatarColorIndex = 0,
    this.tags = const [],
    this.plan = UserPlan.free,
    this.dailyLikesUsed = 0,
    this.dailyLikesLimit = 5,
    this.activeChatCount = 0,
  });

  factory UserModel.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    return UserModel(
      uid: doc.id,
      anonymousId: d['anonymousId'] ?? '',
      nickname: d['nickname'] ?? '',
      bio: d['bio'] ?? '',
      avatarIndex: d['avatarIndex'] ?? 0,
      avatarColorIndex: d['avatarColorIndex'] ?? 0,
      tags: List<String>.from(d['tags'] ?? []),
      plan: UserPlan.values.firstWhere(
        (e) => e.name == (d['plan'] ?? 'free'),
        orElse: () => UserPlan.free,
      ),
      dailyLikesUsed: d['dailyLikesUsed'] ?? 0,
      dailyLikesLimit: d['dailyLikesLimit'] ?? 5,
      activeChatCount: d['activeChatCount'] ?? 0,
    );
  }

  Map<String, dynamic> toMap() => {
        'anonymousId': anonymousId,
        'nickname': nickname,
        'bio': bio,
        'avatarIndex': avatarIndex,
        'avatarColorIndex': avatarColorIndex,
        'tags': tags,
        'plan': plan.name,
        'dailyLikesUsed': dailyLikesUsed,
        'dailyLikesLimit': dailyLikesLimit,
        'activeChatCount': activeChatCount,
      };
}

class MatchCandidate {
  final String uid;
  final String nickname;
  final int avatarIndex;
  final int avatarColorIndex;
  final List<String> tags;
  final String bio;
  final double similarity;
  final List<String> commonTags;

  MatchCandidate({
    required this.uid,
    required this.nickname,
    required this.avatarIndex,
    required this.avatarColorIndex,
    required this.tags,
    required this.bio,
    required this.similarity,
    required this.commonTags,
  });

  factory MatchCandidate.fromFirestore(DocumentSnapshot doc, List<String> myTags) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final theirTags = List<String>.from(d['tags'] ?? []);
    final common = myTags.where((t) => theirTags.contains(t)).toList();
    final union = {...myTags, ...theirTags};
    final sim = union.isEmpty ? 0.0 : common.length / union.length;
    return MatchCandidate(
      uid: doc.id,
      nickname: d['nickname'] ?? '',
      avatarIndex: d['avatarIndex'] ?? 0,
      avatarColorIndex: d['avatarColorIndex'] ?? 0,
      tags: theirTags,
      bio: d['bio'] ?? '',
      similarity: sim,
      commonTags: common,
    );
  }
}

class ChatRoom {
  final String id;
  final String myUid;
  final String theirUid;
  final String theirNickname;
  final int theirAvatarIndex;
  final int messageCount;
  final bool unlocked;
  final String lastMessage;
  final int unreadCount;

  ChatRoom({
    required this.id,
    required this.myUid,
    required this.theirUid,
    required this.theirNickname,
    required this.theirAvatarIndex,
    this.messageCount = 0,
    this.unlocked = false,
    this.lastMessage = '',
    this.unreadCount = 0,
  });

  factory ChatRoom.fromFirestore(DocumentSnapshot doc, String myUid) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    final isA = d['userA'] == myUid;
    return ChatRoom(
      id: doc.id,
      myUid: myUid,
      theirUid: isA ? (d['userB'] ?? '') : (d['userA'] ?? ''),
      theirNickname: isA ? (d['nickB'] ?? '') : (d['nickA'] ?? ''),
      theirAvatarIndex: isA ? (d['avatarB'] ?? 0) : (d['avatarA'] ?? 0),
      messageCount: d['messageCount'] ?? 0,
      unlocked: d['unlocked'] ?? false,
      lastMessage: d['lastMessage'] ?? '',
      unreadCount: isA ? (d['unreadA'] ?? 0) : (d['unreadB'] ?? 0),
    );
  }
}

class ChatMessage {
  final String id;
  final String senderUid;
  final String text;
  final DateTime sentAt;
  final bool isSystem;

  ChatMessage({
    required this.id,
    required this.senderUid,
    required this.text,
    required this.sentAt,
    this.isSystem = false,
  });

  factory ChatMessage.fromFirestore(DocumentSnapshot doc) {
    final d = doc.data() as Map<String, dynamic>? ?? {};
    return ChatMessage(
      id: doc.id,
      senderUid: d['senderUid'] ?? '',
      text: d['text'] ?? '',
      sentAt: (d['sentAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isSystem: d['isSystem'] ?? false,
    );
  }
}

class StoreItem {
  final String id;
  final String title;
  final String subtitle;
  final int priceNTD;
  final ItemType type;

  const StoreItem({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.priceNTD,
    required this.type,
  });
}

const List<StoreItem> kStoreItems = [
  StoreItem(id: 'super_like', title: 'Super Like ×3', subtitle: '讓對方優先看到你', priceNTD: 29, type: ItemType.superLike),
  StoreItem(id: 'match_boost', title: '配對加速 30min', subtitle: '出現在更多人面前', priceNTD: 39, type: ItemType.matchBoost),
  StoreItem(id: 'see_who_liked', title: '查看誰喜歡你', subtitle: '解鎖 24 小時', priceNTD: 49, type: ItemType.seeWhoLiked),
  StoreItem(id: 'unlock_chat', title: '立即解鎖聊天', subtitle: '跳過訊息門檻', priceNTD: 59, type: ItemType.unlockChat),
  StoreItem(id: 'extra_likes', title: '額外 10 次配對', subtitle: '今日限定', priceNTD: 79, type: ItemType.extraLikes),
];

const List<StoreItem> kSubscriptions = [
  StoreItem(id: 'sub_accelerate', title: '加速方案', subtitle: '每日 15 次配對 + 查看誰喜歡你', priceNTD: 149, type: ItemType.subscription),
  StoreItem(id: 'sub_unlimited', title: '無限方案', subtitle: '無限配對 + 所有功能解鎖', priceNTD: 299, type: ItemType.subscription),
];
