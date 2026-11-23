import 'package:flutter/material.dart';

import '../../models/order.dart';
import '../../services/admin_service.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/logout_button.dart';
import '../../widgets/stat_tile.dart';

class AdminStatsScreen extends StatefulWidget {
  const AdminStatsScreen({super.key});

  @override
  State<AdminStatsScreen> createState() => _AdminStatsScreenState();
}

class _AdminStatsScreenState extends State<AdminStatsScreen> {
  List<Map<String, dynamic>> _users = [];
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
      final users = await AdminService.users();
      final orders = await AdminService.orders();
      if (!mounted) return;
      setState(() {
        _users = users;
        _orders = orders;
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

  int _role(String role) => _users.where((u) => (u['role'] ?? '').toString() == role).length;

  bool _done(Order o) => !o.isCancelled && (o.isCollected || o.status == 'completed');

  @override
  Widget build(BuildContext context) {
    final pending = _users.where((u) => u['approvalStatus'] == 'pending').length;
    final cancelled = _orders.where((o) => o.isCancelled).length;
    final done = _orders.where(_done).length;
    final inProgress = _orders.length - cancelled - done;

    var revenue = 0.0;
    var portions = 0;
    for (final o in _orders) {
      if (o.isCancelled) continue;
      if (o.isPaid) revenue += o.totalPrice;
      if (_done(o)) portions += o.quantity;
    }

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            children: [
              PageHeader(
                'Tableau de bord',
                subtitle: 'Vue d\'ensemble de la plateforme',
                trailing: IconButton(
                  tooltip: 'Déconnexion',
                  icon: const Icon(Icons.logout),
                  onPressed: () => confirmLogout(context),
                ),
              ),
              if (_loading && _users.isEmpty && _orders.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
              if (_error != null) ErrorCard(message: _error!, onRetry: _load),
              if (_error == null && (_users.isNotEmpty || _orders.isNotEmpty)) ...[
                StatGrid(
                  tiles: [
                    StatTile(
                      icon: Icons.school_outlined,
                      value: '${_role('student')}',
                      label: 'Étudiants',
                    ),
                    StatTile(
                      icon: Icons.storefront_outlined,
                      value: '${_role('merchant')}',
                      label: 'Commerçants',
                    ),
                    StatTile(
                      icon: Icons.hourglass_top,
                      value: '$pending',
                      label: 'Demandes en attente',
                      color: pending > 0 ? AppColors.danger : null,
                    ),
                    StatTile(
                      icon: Icons.receipt_long_outlined,
                      value: '${_orders.length}',
                      label: 'Commandes',
                    ),
                    StatTile(
                      icon: Icons.payments_outlined,
                      value: money(revenue),
                      label: "Volume d'affaires (payé)",
                    ),
                    StatTile(
                      icon: Icons.eco_outlined,
                      value: '$portions',
                      label: 'Portions sauvées du gaspillage',
                    ),
                  ],
                ),
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Répartition des commandes',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                      ),
                      const SizedBox(height: 12),
                      BreakdownRow(
                        label: 'En cours',
                        count: inProgress,
                        total: _orders.length,
                        color: AppColors.primary,
                      ),
                      BreakdownRow(
                        label: 'Récupérées',
                        count: done,
                        total: _orders.length,
                        color: Colors.green,
                      ),
                      BreakdownRow(
                        label: 'Annulées',
                        count: cancelled,
                        total: _orders.length,
                        color: AppColors.danger,
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}