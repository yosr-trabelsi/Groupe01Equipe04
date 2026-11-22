import 'package:flutter/material.dart';

import '../../models/order.dart';
import '../../services/admin_service.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/logout_button.dart';
import 'manage_users_screen.dart';

class AdminDashboard extends StatefulWidget {
  const AdminDashboard({super.key});

  @override
  State<AdminDashboard> createState() => _AdminDashboardState();
}

class _AdminDashboardState extends State<AdminDashboard> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      const _RequestsTab(),
      const ManageUsersScreen(),
      const _AllOrdersTab(),
    ];
    return Scaffold(
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        height: 68,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.storefront_outlined),
            selectedIcon: Icon(Icons.storefront),
            label: 'Demandes',
          ),
          NavigationDestination(
            icon: Icon(Icons.people_outline),
            selectedIcon: Icon(Icons.people),
            label: 'Utilisateurs',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long),
            label: 'Commandes',
          ),
        ],
      ),
    );
  }
}


class _RequestsTab extends StatefulWidget {
  const _RequestsTab();

  @override
  State<_RequestsTab> createState() => _RequestsTabState();
}

class _RequestsTabState extends State<_RequestsTab> {
  List<Map<String, dynamic>> _pending = [];
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
      final all = await AdminService.users();
      if (!mounted) return;
      setState(() {
        _pending = all.where((u) => u['approvalStatus'] == 'pending').toList();
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

  Future<void> _decide(Map<String, dynamic> u, bool approve) async {
    final uid = (u['uid'] ?? '').toString();
    setState(() => _busyUid = uid);
    try {
      if (approve) {
        await AdminService.approveMerchant(uid);
      } else {
        await AdminService.rejectMerchant(uid);
      }
      if (!mounted) return;
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busyUid = null);
    }
  }

  Widget _card(Map<String, dynamic> u) {
    final uid = (u['uid'] ?? '').toString();
    final busy = _busyUid == uid;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              (u['name'] ?? 'Sans nom').toString(),
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 2),
            Text((u['email'] ?? '').toString(), style: const TextStyle(color: AppColors.muted)),
            if ((u['phone'] ?? '').toString().isNotEmpty)
              Text(
                (u['phone']).toString(),
                style: const TextStyle(color: AppColors.muted),
              ),
            const SizedBox(height: 10),
            if (busy)
              const Center(child: CircularProgressIndicator(color: AppColors.primary))
            else
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: () => _decide(u, true),
                      child: const Text('Approuver'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => _decide(u, false),
                      child: const Text(
                        'Refuser',
                        style: TextStyle(color: AppColors.danger),
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            children: [
              PageHeader(
                'Demandes',
                subtitle: 'Commerçants en attente de validation',
                trailing: IconButton(
                  tooltip: 'Déconnexion',
                  icon: const Icon(Icons.logout),
                  onPressed: () => confirmLogout(context),
                ),
              ),
              if (_loading && _pending.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
              if (_error != null) ErrorCard(message: _error!, onRetry: _load),
              if (!_loading && _error == null && _pending.isEmpty)
                const AppCard(child: Text('Aucune demande en attente.')),
              for (final u in _pending) _card(u),
            ],
          ),
        ),
      ),
    );
  }
}


class _AllOrdersTab extends StatefulWidget {
  const _AllOrdersTab();

  @override
  State<_AllOrdersTab> createState() => _AllOrdersTabState();
}

class _AllOrdersTabState extends State<_AllOrdersTab> {
  List<Order> _orders = [];
  bool _loading = true;
  String? _error;

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
      final list = await AdminService.orders();
      list.sort((a, b) {
        final da = a.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        final db = b.createdAt ?? DateTime.fromMillisecondsSinceEpoch(0);
        return db.compareTo(da);
      });
      if (!mounted) return;
      setState(() {
        _orders = list;
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

  BadgeKind _kind(Order o) {
    if (o.isCancelled) return BadgeKind.red;
    if (o.isCollected || o.status == 'ready' || o.status == 'confirmed') return BadgeKind.green;
    return BadgeKind.accent;
  }

  Widget _card(Order o) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    o.offerTitle,
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                ),
                AppBadge(o.statusLabel, kind: _kind(o)),
              ],
            ),
            const SizedBox(height: 6),
            if (o.businessName.isNotEmpty)
              Text(o.businessName, style: const TextStyle(color: AppColors.muted)),
            Text(
              '${shortId(o.id)}  ·  Quantité : ${o.quantity}  ·  ${money(o.totalPrice)}',
              style: const TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 6),
            AppBadge(
              o.isPaid ? 'Payée' : 'Non payée',
              kind: o.isPaid ? BadgeKind.green : BadgeKind.accent,
            ),
            if (o.createdAt != null) ...[
              const SizedBox(height: 6),
              InfoRow(Icons.schedule, dateTimeLabel(o.createdAt!)),
            ],
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            children: [
              PageHeader(
                'Commandes',
                subtitle: 'Toutes les commandes de la plateforme',
                trailing: IconButton(
                  tooltip: 'Déconnexion',
                  icon: const Icon(Icons.logout),
                  onPressed: () => confirmLogout(context),
                ),
              ),
              if (_loading && _orders.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
              if (_error != null) ErrorCard(message: _error!, onRetry: _load),
              if (!_loading && _error == null && _orders.isEmpty)
                const AppCard(child: Text('Aucune commande.')),
              for (final o in _orders) _card(o),
            ],
          ),
        ),
      ),
    );
  }
}