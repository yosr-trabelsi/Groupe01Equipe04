import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'firebase_options.dart'; // généré par : flutterfire configure
import 'providers/auth_provider.dart';
import 'providers/offers_provider.dart';
import 'providers/orders_provider.dart';
import 'screens/admin/admin_dashboard.dart';
import 'screens/auth/login_screen.dart';
import 'screens/merchant/merchant_dashboard.dart';
import 'screens/student/home_screen.dart';
import 'utils/constants.dart';
import 'utils/theme.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  runApp(const CampusSaveApp());
}

class CampusSaveApp extends StatelessWidget {
  const CampusSaveApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        // Données vidées à la déconnexion (évite de montrer les commandes du compte précédent)
        ChangeNotifierProxyProvider<AuthProvider, OffersProvider>(
          create: (_) => OffersProvider(),
          update: (_, auth, p) {
            if (auth.status == AuthStatus.signedOut) p!.reset();
            return p!;
          },
        ),
        ChangeNotifierProxyProvider<AuthProvider, OrdersProvider>(
          create: (_) => OrdersProvider(),
          update: (_, auth, p) {
            if (auth.status == AuthStatus.signedOut) p!.reset();
            return p!;
          },
        ),
      ],
      child: MaterialApp(
        title: 'CampusSave',
        debugShowCheckedModeBanner: false,
        theme: buildTheme(),
        scaffoldMessengerKey: rootMessengerKey,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    switch (auth.status) {
      case AuthStatus.loading:
        return const Scaffold(
          body: Center(child: CircularProgressIndicator(color: AppColors.primary)),
        );
      case AuthStatus.signedOut:
        return const LoginScreen();
      case AuthStatus.signedIn:
        if (auth.user?.isMerchant == true) return const MerchantDashboard();
        if (auth.user?.role == 'admin') return const AdminDashboard();
        return const HomeScreen();
    }
  }
}