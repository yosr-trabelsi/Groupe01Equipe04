import 'dart:async';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import '../models/user.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/notification_service.dart';

enum AuthStatus { loading, signedOut, signedIn }

class AuthProvider extends ChangeNotifier {
  AuthStatus status = AuthStatus.loading;
  AppUser? user;
  String? notice; 
  StreamSubscription<User?>? _sub;

  AuthProvider() {
    _sub = AuthService.authChanges.listen(_onAuthChanged);
  }

  Future<void> _onAuthChanged(User? u) async {
    if (u == null) {
      user = null;
      status = AuthStatus.signedOut;
      notifyListeners();
      return;
    }
    status = AuthStatus.loading;
    notifyListeners();
    try {
      final profile = await AuthService.fetchProfile();
      if (!profile.isStudent && !profile.isMerchant && profile.role != 'admin') {
        notice = 'Ce type de compte n’est pas pris en charge sur mobile.';
        await AuthService.signOut();
        return;
      }
      user = profile;
      notice = null;
      status = AuthStatus.signedIn;
      notifyListeners();
      NotificationService.init();
    } on ApiException catch (e) {
      notice = e.message;
      await AuthService.signOut();
    }
  }

  Future<String?> login(String email, String password) async {
    notice = null;
    try {
      await AuthService.signIn(email, password);
      return null;
    } on FirebaseAuthException catch (e) {
      return AuthService.firebaseMessage(e.code);
    }
  }

  Future<String?> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    try {
      await AuthService.register(name: name, email: email, password: password, phone: phone);
      return null;
    } on ApiException catch (e) {
      return e.message;
    } on FirebaseAuthException catch (e) {
      return AuthService.firebaseMessage(e.code);
    }
  }

  Future<String?> updateProfile({required String name, required String phone}) async {
    try {
      final updated = await AuthService.updateProfile(name: name, phone: phone);
      user = user?.copyWith(name: updated.name, phone: updated.phone) ?? updated;
      notifyListeners();
      return null;
    } on ApiException catch (e) {
      return e.message;
    }
  }

  Future<String?> resetPassword(String email) async {
    try {
      await AuthService.resetPassword(email);
      return null;
    } on FirebaseAuthException catch (e) {
      return AuthService.firebaseMessage(e.code);
    }
  }

  Future<void> logout() => AuthService.signOut();

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }
}