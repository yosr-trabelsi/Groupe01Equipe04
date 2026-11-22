import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../providers/auth_provider.dart';
import '../../services/admin_service.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/logout_button.dart';

class ManageUsersScreen extends StatefulWidget {
  const ManageUsersScreen({super.key});

  @override
  State<ManageUsersScreen> createState() => _ManageUsersScreenState();
}

class _ManageUsersScreenState extends State<ManageUsersScreen> {
  List<Map<String, dynamic>> _users = [];
  bool _loading = true;
  String? _error;
  String? _busyUid;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final list = await AdminService.users();
      if (!mounted) return;
      setState(() {
        _users = list;
        _loading = false;
      });
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.message;
        _loading = false;
      });
    }
  }

  Future<void> _toggle(Map<String, dynamic> u, bool value) async {
    final uid = (u['uid'] ?? '').toString();
    setState(() => _busyUid = uid);
    try {
      await AdminService.setUserActive(uid, value);
      if (!mounted) return;
      setState(() => u['isActive'] = value);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busyUid = null);
    }
  }

  String _roleLabel(String r) {
    switch (r) {
      case 'student':
        return 'Étudiant';
      case 'merchant':
        return 'Commerçant';
      case 'admin':
        return 'Admin';
      default:
        return r.isEmpty ? 'Inconnu' : r;
    }
  }

  Widget _card(Map<String, dynamic> u, String myUid) {
    final uid = (u['uid'] ?? '').toString();
    final active = u['isActive'] != false;
    final isMe = uid == myUid;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    (u['name'] ?? 'Sans nom').toString(),
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    (u['email'] ?? '').toString(),
                    style: const TextStyle(color: AppColors.muted),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: [
                      AppBadge(_roleLabel((u['role'] ?? '').toString()), kind: BadgeKind.accent),
                      AppBadge(
                        active ? 'Actif' : 'Désactivé',
                        kind: active ? BadgeKind.green : BadgeKind.red,
                      ),
                    ],
                  ),
                ],
              ),
            ),
            if (_busyUid == uid)
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.primary),
              )
            else
              Switch(
                value: active,
                onChanged: isMe ? null : (v) => _toggle(u, v),
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final myUid = context.read<AuthProvider>().user?.uid ?? '';
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            children: [
              PageHeader(
                'Utilisateurs',
                subtitle: 'Activer ou désactiver un compte',
                trailing: IconButton(
                  tooltip: 'Déconnexion',
                  icon: const Icon(Icons.logout),
                  onPressed: () => confirmLogout(context),
                ),
              ),
              if (_loading && _users.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
              if (_error != null) ErrorCard(message: _error!, onRetry: _load),
              if (!_loading && _error == null && _users.isEmpty)
                const AppCard(child: Text('Aucun utilisateur.')),
              for (final u in _users) _card(u, myUid),
            ],
          ),
        ),
      ),
    );
  }
}