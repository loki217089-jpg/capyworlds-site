import 'dart:math';
import 'package:flutter/material.dart';

const List<Color> kAvatarPalette = [
  Color(0xFF6C63FF),
  Color(0xFFFF6B6B),
  Color(0xFF4ECDC4),
  Color(0xFFFFD93D),
  Color(0xFFFF8A65),
  Color(0xFF81C784),
  Color(0xFFBA68C8),
  Color(0xFF4FC3F7),
];

const List<String> kAllTags = [
  '電影', '音樂', '旅行', '美食', '攝影', '閱讀',
  '健身', '瑜珈', '登山', '游泳', '單車', '跑步',
  '貓派', '狗派', '動漫', '電玩', '桌遊', '手作',
  '咖啡', '茶藝', '調酒', '烘焙', '素食', '園藝',
  '科技', '投資', '創業', '心理學', '哲學', '語言學習',
  '占星', '塔羅', '冥想', '極簡主義', '環保', '志工',
];

class AnonymousAvatar extends StatelessWidget {
  final int shapeIndex;
  final int colorIndex;
  final double size;

  const AnonymousAvatar({
    super.key,
    required this.shapeIndex,
    required this.colorIndex,
    this.size = 56,
  });

  @override
  Widget build(BuildContext context) {
    final color = kAvatarPalette[colorIndex % kAvatarPalette.length];
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _AvatarPainter(
          shape: shapeIndex % 6,
          color: color,
        ),
      ),
    );
  }
}

class _AvatarPainter extends CustomPainter {
  final int shape;
  final Color color;

  _AvatarPainter({required this.shape, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill;
    final cx = size.width / 2;
    final cy = size.height / 2;
    final r = size.width * 0.42;

    switch (shape) {
      case 0: // circle
        canvas.drawCircle(Offset(cx, cy), r, paint);
        break;
      case 1: // hexagon
        _drawPolygon(canvas, cx, cy, r, 6, paint);
        break;
      case 2: // rounded square
        canvas.drawRRect(
          RRect.fromRectAndRadius(
            Rect.fromCenter(center: Offset(cx, cy), width: r * 1.8, height: r * 1.8),
            Radius.circular(r * 0.3),
          ),
          paint,
        );
        break;
      case 3: // diamond
        _drawPolygon(canvas, cx, cy, r, 4, paint, rotation: 0);
        break;
      case 4: // triangle
        _drawPolygon(canvas, cx, cy, r, 3, paint, rotation: -pi / 2);
        break;
      case 5: // star
        _drawStar(canvas, cx, cy, r, paint);
        break;
    }

    // inner accent
    final accentPaint = Paint()
      ..color = Colors.white.withValues(alpha: 0.25)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(Offset(cx, cy), r * 0.35, accentPaint);
  }

  void _drawPolygon(Canvas canvas, double cx, double cy, double r, int sides, Paint paint, {double rotation = -pi / 2}) {
    final path = Path();
    for (int i = 0; i < sides; i++) {
      final angle = rotation + (2 * pi * i / sides);
      final x = cx + r * cos(angle);
      final y = cy + r * sin(angle);
      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  void _drawStar(Canvas canvas, double cx, double cy, double r, Paint paint) {
    final path = Path();
    for (int i = 0; i < 5; i++) {
      final outerAngle = -pi / 2 + (2 * pi * i / 5);
      final innerAngle = outerAngle + pi / 5;
      final ox = cx + r * cos(outerAngle);
      final oy = cy + r * sin(outerAngle);
      final ix = cx + r * 0.45 * cos(innerAngle);
      final iy = cy + r * 0.45 * sin(innerAngle);
      if (i == 0) {
        path.moveTo(ox, oy);
      } else {
        path.lineTo(ox, oy);
      }
      path.lineTo(ix, iy);
    }
    path.close();
    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant _AvatarPainter old) =>
      old.shape != shape || old.color != color;
}
