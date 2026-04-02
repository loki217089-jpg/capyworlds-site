import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:provider/provider.dart';
import 'package:go_router/go_router.dart';

import 'theme/app_theme.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/tag_select_screen.dart';
import 'screens/main_shell.dart';
import 'screens/chat_room_screen.dart';
import 'screens/store_screen.dart';
import 'screens/settings_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();
  runApp(const VeilMatchApp());
}

class VeilMatchApp extends StatelessWidget {
  const VeilMatchApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeNotifier()),
        ChangeNotifierProvider(create: (_) => AuthService()),
      ],
      child: Consumer2<ThemeNotifier, AuthService>(
        builder: (context, themeNotifier, auth, _) {
          final router = GoRouter(
            initialLocation: auth.isLoggedIn ? '/discover' : '/login',
            redirect: (context, state) {
              final loggedIn = auth.isLoggedIn;
              final loggingIn = state.matchedLocation == '/login' ||
                  state.matchedLocation == '/register';
              if (!loggedIn && !loggingIn) return '/login';
              return null;
            },
            routes: [
              GoRoute(
                  path: '/login',
                  builder: (_, __) => const LoginScreen()),
              GoRoute(
                  path: '/register',
                  builder: (_, __) => const RegisterScreen()),
              GoRoute(
                  path: '/tags',
                  builder: (_, __) => const TagSelectScreen()),
              GoRoute(
                  path: '/discover',
                  builder: (_, __) => const MainShell(initialIndex: 0)),
              GoRoute(
                  path: '/chats',
                  builder: (_, __) => const MainShell(initialIndex: 1)),
              GoRoute(
                path: '/chats/:id',
                builder: (_, state) =>
                    ChatRoomScreen(chatId: state.pathParameters['id']!),
              ),
              GoRoute(
                  path: '/profile',
                  builder: (_, __) => const MainShell(initialIndex: 2)),
              GoRoute(
                  path: '/store',
                  builder: (_, __) => const StoreScreen()),
              GoRoute(
                  path: '/settings',
                  builder: (_, __) => const SettingsScreen()),
            ],
          );

          return MaterialApp.router(
            title: 'VeilMatch',
            debugShowCheckedModeBanner: false,
            theme: themeNotifier.theme,
            routerConfig: router,
          );
        },
      ),
    );
  }
}
