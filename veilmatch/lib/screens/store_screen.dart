import 'package:flutter/material.dart';
import '../models/user_model.dart';

class StoreScreen extends StatelessWidget {
  const StoreScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;

    return Scaffold(
      appBar: AppBar(title: const Text('商店')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Warning banner
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: Colors.amber.withValues(alpha: 0.3)),
            ),
            child: Row(
              children: [
                const Icon(Icons.info_outline, color: Colors.amber, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '今日剩餘配對次數不多了，升級方案獲得更多機會！',
                    style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.8)),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          // Subscriptions
          Text('訂閱方案', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: cs.primary)),
          const SizedBox(height: 12),
          ...kSubscriptions.map((item) => _SubscriptionCard(item: item)),
          const SizedBox(height: 24),
          // Single purchase
          Text('單次購買', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: cs.primary)),
          const SizedBox(height: 12),
          GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            mainAxisSpacing: 8,
            crossAxisSpacing: 8,
            childAspectRatio: 1.1,
            children: kStoreItems.map((item) => _ItemCard(item: item)).toList(),
          ),
        ],
      ),
    );
  }
}

class _SubscriptionCard extends StatelessWidget {
  final StoreItem item;
  const _SubscriptionCard({required this.item});

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    final isTop = item.priceNTD == 299;
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: isTop ? BorderSide(color: cs.primary, width: 2) : BorderSide.none,
      ),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showPurchaseSheet(context, item),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Icon(isTop ? Icons.diamond : Icons.bolt, color: cs.primary, size: 32),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        if (isTop) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(color: cs.primary, borderRadius: BorderRadius.circular(8)),
                            child: const Text('推薦', style: TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(item.subtitle, style: TextStyle(fontSize: 13, color: cs.onSurface.withValues(alpha: 0.6))),
                  ],
                ),
              ),
              Text('NT\$${item.priceNTD}/月', style: TextStyle(fontWeight: FontWeight.bold, color: cs.primary, fontSize: 15)),
            ],
          ),
        ),
      ),
    );
  }
}

class _ItemCard extends StatelessWidget {
  final StoreItem item;
  const _ItemCard({required this.item});

  static const _icons = {
    ItemType.superLike: Icons.star,
    ItemType.matchBoost: Icons.rocket_launch,
    ItemType.seeWhoLiked: Icons.visibility,
    ItemType.unlockChat: Icons.lock_open,
    ItemType.extraLikes: Icons.favorite,
  };

  @override
  Widget build(BuildContext context) {
    final cs = Theme.of(context).colorScheme;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => _showPurchaseSheet(context, item),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(_icons[item.type] ?? Icons.shopping_bag, color: cs.primary, size: 28),
              const SizedBox(height: 8),
              Text(item.title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13), textAlign: TextAlign.center),
              const SizedBox(height: 4),
              Text(item.subtitle, style: TextStyle(fontSize: 11, color: cs.onSurface.withValues(alpha: 0.5)), textAlign: TextAlign.center),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: cs.primary.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text('NT\$${item.priceNTD}', style: TextStyle(fontWeight: FontWeight.bold, color: cs.primary, fontSize: 13)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

void _showPurchaseSheet(BuildContext context, StoreItem item) {
  final cs = Theme.of(context).colorScheme;
  showModalBottomSheet(
    context: context,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
    ),
    builder: (ctx) => Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 40, height: 4, decoration: BoxDecoration(color: cs.onSurface.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),
          Text(item.title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(item.subtitle, style: TextStyle(color: cs.onSurface.withValues(alpha: 0.6))),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: () {
                Navigator.pop(ctx);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('購買功能開發中，敬請期待！')),
                );
              },
              child: Text('確認購買 NT\$${item.priceNTD}'),
            ),
          ),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('取消'),
          ),
          SizedBox(height: MediaQuery.of(ctx).padding.bottom),
        ],
      ),
    ),
  );
}
