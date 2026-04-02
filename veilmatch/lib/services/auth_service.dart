import 'dart:math';
import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user_model.dart';

const _adjectives = ['神秘', '溫柔', '安靜', '勇敢', '自由', '快樂', '夢幻', '星空'];
const _nouns = ['旅人', '貓咪', '鯨魚', '蝴蝶', '月光', '森林', '海風', '雲朵'];

class AuthService extends ChangeNotifier {
  final FirebaseAuth _auth = FirebaseAuth.instance;
  final FirebaseFirestore _db = FirebaseFirestore.instance;

  User? get currentUser => _auth.currentUser;
  bool get isLoggedIn => currentUser != null;

  AuthService() {
    _auth.authStateChanges().listen((_) => notifyListeners());
  }

  String _generateAnonymousId() {
    final rng = Random.secure();
    final chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    final code = List.generate(4, (_) => chars[rng.nextInt(chars.length)]).join();
    return 'VL-$code';
  }

  String _generateNickname() {
    final rng = Random.secure();
    final adj = _adjectives[rng.nextInt(_adjectives.length)];
    final noun = _nouns[rng.nextInt(_nouns.length)];
    return '$adj$noun';
  }

  Future<String?> register(String email, String password) async {
    try {
      final cred = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      final uid = cred.user!.uid;
      final rng = Random.secure();
      await _db.collection('users').doc(uid).set({
        'anonymousId': _generateAnonymousId(),
        'nickname': _generateNickname(),
        'bio': '',
        'avatarIndex': rng.nextInt(6),
        'avatarColorIndex': rng.nextInt(8),
        'tags': <String>[],
        'plan': 'free',
        'dailyLikesUsed': 0,
        'dailyLikesLimit': 5,
        'activeChatCount': 0,
        'createdAt': FieldValue.serverTimestamp(),
      });
      return null;
    } on FirebaseAuthException catch (e) {
      return _translateError(e.code);
    }
  }

  Future<String?> login(String email, String password) async {
    try {
      await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );
      return null;
    } on FirebaseAuthException catch (e) {
      return _translateError(e.code);
    }
  }

  Future<void> logout() async {
    await _auth.signOut();
  }

  Future<String?> deleteAccount() async {
    try {
      final uid = currentUser?.uid;
      if (uid != null) {
        await _db.collection('users').doc(uid).delete();
      }
      await currentUser?.delete();
      return null;
    } on FirebaseAuthException catch (e) {
      return _translateError(e.code);
    }
  }

  Future<UserModel?> getMyProfile() async {
    final uid = currentUser?.uid;
    if (uid == null) return null;
    final doc = await _db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return UserModel.fromFirestore(doc);
  }

  Future<void> updateTags(List<String> tags) async {
    final uid = currentUser?.uid;
    if (uid == null) return;
    await _db.collection('users').doc(uid).update({'tags': tags});
  }

  String _translateError(String code) {
    switch (code) {
      case 'email-already-in-use':
        return '此 Email 已被註冊';
      case 'invalid-email':
        return 'Email 格式不正確';
      case 'weak-password':
        return '密碼強度不足（至少 6 位）';
      case 'user-not-found':
        return '找不到此帳號';
      case 'wrong-password':
        return '密碼錯誤';
      case 'too-many-requests':
        return '嘗試次數過多，請稍後再試';
      case 'requires-recent-login':
        return '請重新登入後再操作';
      default:
        return '發生錯誤：$code';
    }
  }
}
