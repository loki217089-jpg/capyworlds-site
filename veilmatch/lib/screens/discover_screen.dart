import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../services/match_service.dart';
import '../models/user_model.dart';
import '../widgets/anonymous_avatar.dart';

class DiscoverScreen extends StatefulWidget {
  const DiscoverScreen({super.key});

  @override
  State<DiscoverScreen> createState() => _DiscoverScreenState();
}

class _DiscoverScreenState extends State<DiscoverScreen> with SingleTickerProviderStateMixin {
  final _matchService = MatchService();
  List<MatchCandidate> _candidates = [];
  int _currentIndex = 0;
  bool _loading = true;
  bool _matchAnim = false;

  @override
  void initState() {
    super.initState();
    _loadCandidates();
  }

  Future<void> _loadCandidates() async {
    setState(() => _loading = true);
    final list = await _matchService.fetchCandidates();
    if (!mounted) return;
    setState(() {
      _candidates = list;
      _currentIndex = 0;
      _loading = false;
    });
  }

  Future<void> _onLike() async {
    if (_currentIndex >= _candidates.length) return;
    final c = _candidates[_currentIndex];
    final matched = await _matchService.like(c.uid);
    if (!mounted) return;
    if (matched) {
      setState(() => _matchAnim = true);
      await Future.delayed(const Duration(seconds: 2));
      if (!mounted) return;
      setState(() => _matchAnim = false);
    }
    _next();
  }

  Future<void> _onSkip() async {
    if (_currentIndex >= _candidates.length) return;
    final c = _candidates[_currentIndex];
    await _matchService.skip(c.uid);
    _next();
  }

  void _next() {
    setState(() => _currentIndex++);
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_matchAnim) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.favorite, size: 80, color: cs.primary),
            const SizedBox(height: 16),
            Text('配對成功！', style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: cs.primary)),
            const SizedBox(height: 8),
            Text('快去聊天吧', style: TextStyle(color: cs.onSurface.withValues(alpha: 0.6))),
          ],
        ),
      );
    }

    if (_currentIndex >= _candidates.length) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.search_off, size: 64, color: cs.onSurface.withValues(alpha: 0.3)),
              const SizedBox(height: 16),
              const Text('今日配對已用完', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Text('明天會有新的推薦，或者可以購買額外次數', style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5), fontSize: 14), textAlign: TextAlign.center),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                onPressed: () => context.go('/store'),
                icon: const Icon(Icons.store),
                label: const Text('前往商店'),
              ),
            ],
          ),
        ),
      );
    }

    final c = _candidates[_currentIndex];
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('探索', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: cs.primary)),
                Text('${_currentIndex + 1}/${_candidates.length}', style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5))),
              ],
            ),
            const SizedBox(height: 20),
            Expanded(
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    children: [
                      AnonymousAvatar(shapeIndex: c.avatarIndex, colorIndex: c.avatarColorIndex, size: 96),
                      const SizedBox(height: 16),
                      Text(c.nickname, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                        decoration: BoxDecoration(
                          color: cs.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Text('${(c.similarity * 100).toInt()}% 契合', style: TextStyle(color: cs.primary, fontWeight: FontWeight.w600)),
                      ),
                      const SizedBox(height: 12),
                      if (c.bio.isNotEmpty) ...[
                        Text(c.bio, style: TextStyle(color: cs.onSurface.withValues(alpha: 0.7)), textAlign: TextAlign.center),
                        const SizedBox(height: 12),
                      ],
                      if (c.commonTags.isNotEmpty) ...[
                        Text('共同興趣', style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.5))),
                        const SizedBox(height: 6),
                        Wrap(
                          spacing: 6,
                          runSpacing: 6,
                          children: c.commonTags.map((t) => Chip(
                            label: Text(t, style: const TextStyle(fontSize: 12)),
                            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                            visualDensity: VisualDensity.compact,
                          )).toList(),
                        ),
                      ],
                      const Spacer(),
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        alignment: WrapAlignment.center,
                        children: c.tags.map((t) => Text(
                          '#$t',
                          style: TextStyle(fontSize: 12, color: cs.onSurface.withValues(alpha: 0.4)),
                        )).toList(),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                FloatingActionButton(
                  heroTag: 'skip',
                  onPressed: _onSkip,
                  backgroundColor: cs.surface,
                  child: Icon(Icons.close, color: cs.onSurface.withValues(alpha: 0.6), size: 28),
                ),
                FloatingActionButton.large(
                  heroTag: 'like',
                  onPressed: _onLike,
                  backgroundColor: cs.primary,
                  child: const Icon(Icons.favorite, color: Colors.white, size: 36),
                ),
                FloatingActionButton(
                  heroTag: 'super',
                  onPressed: _onLike,
                  backgroundColor: cs.secondary,
                  child: const Icon(Icons.star, color: Colors.white, size: 28),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
