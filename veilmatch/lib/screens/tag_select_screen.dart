import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../widgets/anonymous_avatar.dart';

class TagSelectScreen extends StatefulWidget {
  const TagSelectScreen({super.key});

  @override
  State<TagSelectScreen> createState() => _TagSelectScreenState();
}

class _TagSelectScreenState extends State<TagSelectScreen> {
  final Set<String> _selected = {};
  bool _saving = false;

  Future<void> _save() async {
    if (_selected.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('請至少選擇 3 個標籤')),
      );
      return;
    }
    setState(() => _saving = true);
    await context.read<AuthService>().updateTags(_selected.toList());
    if (!mounted) return;
    context.go('/discover');
  }

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Scaffold(
      appBar: AppBar(title: const Text('選擇你的興趣標籤')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              '選擇 3~8 個標籤，我們會根據標籤幫你配對',
              style: TextStyle(color: cs.onSurface.withValues(alpha: 0.6)),
            ),
          ),
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Wrap(
                spacing: 8,
                runSpacing: 8,
                children: kAllTags.map((tag) {
                  final sel = _selected.contains(tag);
                  return FilterChip(
                    label: Text(tag),
                    selected: sel,
                    onSelected: (v) {
                      setState(() {
                        if (v && _selected.length < 8) {
                          _selected.add(tag);
                        } else {
                          _selected.remove(tag);
                        }
                      });
                    },
                    selectedColor: cs.primary.withValues(alpha: 0.3),
                    checkmarkColor: cs.primary,
                  );
                }).toList(),
              ),
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Text('已選 ${_selected.length}/8', style: TextStyle(color: cs.onSurface.withValues(alpha: 0.5))),
                const SizedBox(height: 8),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _saving ? null : _save,
                    child: _saving
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : const Text('確認，開始配對！'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
