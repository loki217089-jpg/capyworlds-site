import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../models/user_model.dart';
import '../widgets/anonymous_avatar.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final auth = context.watch<AuthService>();

    return SafeArea(
      child: FutureBuilder<UserModel?>(
        future: auth.getMyProfile(),
        builder: (context, snap) {
          if (snap.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          final user = snap.data;
          if (user == null) {
            return const Center(child: Text('無法載入個人資料'));
          }
          return SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const SizedBox(height: 8),
                AnonymousAvatar(shapeIndex: user.avatarIndex, colorIndex: user.avatarColorIndex, size: 80),
                const SizedBox(height: 12),
                Text(user.nickname, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(user.anonymousId, style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5), fontSize: 14)),
                const SizedBox(height: 20),
                // Tags
                Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: user.tags.map((t) => Chip(
                    label: Text(t, style: const TextStyle(fontSize: 12)),
                    materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    visualDensity: VisualDensity.compact,
                  )).toList(),
                ),
                const SizedBox(height: 24),
                // Stats
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('今日統計', style: TextStyle(fontWeight: FontWeight.bold, color: cs.primary)),
                        const SizedBox(height: 12),
                        _StatRow(label: '配對使用', value: '${user.dailyLikesUsed}/${user.dailyLikesLimit}'),
                        _StatRow(label: '進行中聊天', value: '${user.activeChatCount}'),
                        _StatRow(label: '方案', value: user.plan == UserPlan.free ? '免費' : user.plan == UserPlan.accelerate ? '加速' : '無限'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => context.go('/store'),
                    icon: const Icon(Icons.diamond_outlined),
                    label: const Text('升級方案'),
                  ),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => context.go('/settings'),
                    icon: const Icon(Icons.settings_outlined),
                    label: const Text('設定'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _StatRow extends StatelessWidget {
  final String label;
  final String value;
  const _StatRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.7))),
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600)),
        ],
      ),
    );
  }
}
