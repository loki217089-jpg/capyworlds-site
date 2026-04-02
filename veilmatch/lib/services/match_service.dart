import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../models/user_model.dart';

class MatchService {
  final _db = FirebaseFirestore.instance;
  final _auth = FirebaseAuth.instance;

  String get _uid => _auth.currentUser!.uid;

  Future<List<MatchCandidate>> fetchCandidates() async {
    final myDoc = await _db.collection('users').doc(_uid).get();
    final myData = myDoc.data() ?? {};
    final myTags = List<String>.from(myData['tags'] ?? []);

    // Get skipped and blocked uids
    final skippedSnap = await _db
        .collection('users')
        .doc(_uid)
        .collection('skipped')
        .get();
    final blockedSnap = await _db
        .collection('users')
        .doc(_uid)
        .collection('blocked')
        .get();
    final likedSnap = await _db
        .collection('users')
        .doc(_uid)
        .collection('liked')
        .get();

    final excludeIds = <String>{
      _uid,
      ...skippedSnap.docs.map((d) => d.id),
      ...blockedSnap.docs.map((d) => d.id),
      ...likedSnap.docs.map((d) => d.id),
    };

    final usersSnap = await _db.collection('users').limit(100).get();
    final candidates = <MatchCandidate>[];
    for (final doc in usersSnap.docs) {
      if (excludeIds.contains(doc.id)) continue;
      candidates.add(MatchCandidate.fromFirestore(doc, myTags));
    }
    candidates.sort((a, b) => b.similarity.compareTo(a.similarity));
    return candidates.take(20).toList();
  }

  Future<bool> like(String targetUid) async {
    // Record my like
    await _db
        .collection('users')
        .doc(_uid)
        .collection('liked')
        .doc(targetUid)
        .set({'at': FieldValue.serverTimestamp()});

    // Check if they liked me too
    final theirLike = await _db
        .collection('users')
        .doc(targetUid)
        .collection('liked')
        .doc(_uid)
        .get();

    if (theirLike.exists) {
      // Mutual match — create chat room
      final myDoc = await _db.collection('users').doc(_uid).get();
      final theirDoc = await _db.collection('users').doc(targetUid).get();
      final myData = myDoc.data() ?? {};
      final theirData = theirDoc.data() ?? {};

      final chatId = _uid.compareTo(targetUid) < 0
          ? '${_uid}_$targetUid'
          : '${targetUid}_$_uid';

      await _db.collection('chats').doc(chatId).set({
        'userA': _uid,
        'userB': targetUid,
        'nickA': myData['nickname'] ?? '',
        'nickB': theirData['nickname'] ?? '',
        'avatarA': myData['avatarIndex'] ?? 0,
        'avatarB': theirData['avatarIndex'] ?? 0,
        'messageCount': 0,
        'unlocked': false,
        'lastMessage': '',
        'unreadA': 0,
        'unreadB': 0,
        'createdAt': FieldValue.serverTimestamp(),
      });

      // Increment activeChatCount for both
      await _db.collection('users').doc(_uid).update({
        'activeChatCount': FieldValue.increment(1),
      });
      await _db.collection('users').doc(targetUid).update({
        'activeChatCount': FieldValue.increment(1),
      });

      return true; // matched!
    }
    return false;
  }

  Future<void> skip(String targetUid) async {
    await _db
        .collection('users')
        .doc(_uid)
        .collection('skipped')
        .doc(targetUid)
        .set({'at': FieldValue.serverTimestamp()});
  }

  Future<List<MatchCandidate>> fetchWhoLikedMe() async {
    final myDoc = await _db.collection('users').doc(_uid).get();
    final myTags = List<String>.from(myDoc.data()?['tags'] ?? []);

    // Find users who have me in their liked subcollection
    // This requires a collectionGroup query or denormalized data
    // For MVP, we store likes in a top-level collection too
    final likesSnap = await _db
        .collection('likes')
        .where('targetUid', isEqualTo: _uid)
        .get();

    final candidates = <MatchCandidate>[];
    for (final likeDoc in likesSnap.docs) {
      final fromUid = likeDoc['fromUid'] as String;
      final userDoc = await _db.collection('users').doc(fromUid).get();
      if (userDoc.exists) {
        candidates.add(MatchCandidate.fromFirestore(userDoc, myTags));
      }
    }
    return candidates;
  }

  Future<void> report(String targetUid, String reason) async {
    await _db.collection('reports').add({
      'reporterUid': _uid,
      'targetUid': targetUid,
      'reason': reason,
      'at': FieldValue.serverTimestamp(),
    });
  }

  Future<void> block(String targetUid) async {
    await _db
        .collection('users')
        .doc(_uid)
        .collection('blocked')
        .doc(targetUid)
        .set({'at': FieldValue.serverTimestamp()});
  }
}
