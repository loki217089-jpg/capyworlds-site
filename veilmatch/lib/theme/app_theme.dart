import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

enum AppThemeMode { darkBlue, coral, mint, mono }

class AppThemeColors {
  final Color primary;
  final Color accent;
  final Color darkBg;
  final Color darkCard;

  const AppThemeColors({
    required this.primary,
    required this.accent,
    required this.darkBg,
    required this.darkCard,
  });
}

const Map<AppThemeMode, AppThemeColors> kThemeColors = {
  AppThemeMode.darkBlue: AppThemeColors(
    primary: Color(0xFF6C63FF),
    accent: Color(0xFF82B1FF),
    darkBg: Color(0xFF0D1117),
    darkCard: Color(0xFF161B22),
  ),
  AppThemeMode.coral: AppThemeColors(
    primary: Color(0xFFFF6B6B),
    accent: Color(0xFFFFAB91),
    darkBg: Color(0xFF1A1215),
    darkCard: Color(0xFF261A1E),
  ),
  AppThemeMode.mint: AppThemeColors(
    primary: Color(0xFF4ECDC4),
    accent: Color(0xFFA8E6CF),
    darkBg: Color(0xFF0D1512),
    darkCard: Color(0xFF152220),
  ),
  AppThemeMode.mono: AppThemeColors(
    primary: Color(0xFFBBBBBB),
    accent: Color(0xFFE0E0E0),
    darkBg: Color(0xFF121212),
    darkCard: Color(0xFF1E1E1E),
  ),
};

ThemeData darkTheme(AppThemeMode mode) {
  final c = kThemeColors[mode]!;
  return ThemeData(
    brightness: Brightness.dark,
    scaffoldBackgroundColor: c.darkBg,
    colorScheme: ColorScheme.dark(
      primary: c.primary,
      secondary: c.accent,
      surface: c.darkCard,
    ),
    cardColor: c.darkCard,
    appBarTheme: AppBarTheme(
      backgroundColor: c.darkBg,
      elevation: 0,
    ),
    navigationBarTheme: NavigationBarThemeData(
      backgroundColor: c.darkCard,
      indicatorColor: c.primary.withValues(alpha: 0.2),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: c.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: c.darkCard,
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.primary),
      ),
    ),
    chipTheme: ChipThemeData(
      backgroundColor: c.darkCard,
      selectedColor: c.primary.withValues(alpha: 0.3),
      labelStyle: const TextStyle(fontSize: 13),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
  );
}

ThemeData lightTheme(AppThemeMode mode) {
  final c = kThemeColors[mode]!;
  return ThemeData(
    brightness: Brightness.light,
    colorScheme: ColorScheme.light(
      primary: c.primary,
      secondary: c.accent,
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        backgroundColor: c.primary,
        foregroundColor: Colors.white,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(12),
        borderSide: BorderSide(color: c.primary),
      ),
    ),
    chipTheme: ChipThemeData(
      selectedColor: c.primary.withValues(alpha: 0.2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
    ),
  );
}

class ThemeNotifier extends ChangeNotifier {
  AppThemeMode _mode = AppThemeMode.darkBlue;
  bool _isDark = true;

  AppThemeMode get mode => _mode;
  bool get isDark => _isDark;
  ThemeData get theme => _isDark ? darkTheme(_mode) : lightTheme(_mode);

  ThemeNotifier() {
    _load();
  }

  Future<void> _load() async {
    final prefs = await SharedPreferences.getInstance();
    _isDark = prefs.getBool('isDark') ?? true;
    final idx = prefs.getInt('themeMode') ?? 0;
    _mode = AppThemeMode.values[idx.clamp(0, AppThemeMode.values.length - 1)];
    notifyListeners();
  }

  Future<void> setDark(bool v) async {
    _isDark = v;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    prefs.setBool('isDark', v);
  }

  Future<void> setMode(AppThemeMode m) async {
    _mode = m;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    prefs.setInt('themeMode', m.index);
  }
}
