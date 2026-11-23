import 'package:flutter/material.dart';

import '../../models/order.dart';
import '../../services/api_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/logout_button.dart';
import '../../widgets/stat_tile.dart';

class MerchantStatsScreen extends StatefulWidget {
  const MerchantStatsScreen({super.key});

  @override
  State<MerchantStatsScreen> createState() => _MerchantStatsScreenState();
}

class _MerchantStatsScreenState extends State<MerchantStatsScreen> {
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
      final list = await MerchantService.merchantOrders();
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

  bool _done(Order o) => !o.isCancelled && (o.isCollected || o.status == 'completed');

  @override
  Widget build(BuildContext context) {
    final cancelled = _orders.where((o) => o.isCancelled).length;
    final done = _orders.where(_done).length;
    final inProgress = _orders.length - cancelled - done;

    var revenue = 0.0;
    var portions = 0;
    final byProduct = <String, int>{};
    for (final o in _orders) {
      if (o.isCancelled) continue;
      if (o.isPaid) revenue += o.totalPrice;
      if (_done(o)) portions += o.quantity;
      byProduct[o.offerTitle] = (byProduct[o.offerTitle] ?? 0) + o.quantity;
    }
    final top = byProduct.entries.toList()..sort((a, b) => b.value.compareTo(a.value));

    return Scaffold(
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
            children: [
              PageHeader(
                'Statistiques',
                subtitle: 'Votre activité sur CampusSave',
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
                const AppCard(child: Text('Aucune commande pour le moment.')),
              if (_orders.isNotEmpty) ...[
                StatGrid(
                  tiles: [
                    StatTile(
                      icon: Icons.payments_outlined,
                      value: money(revenue),
                      label: "Chiffre d'affaires (payé)",
                    ),
                    StatTile(
                      icon: Icons.receipt_long_outlined,
                      value: '${_orders.length}',
                      label: 'Commandes reçues',
                    ),
                    StatTile(
                      icon: Icons.check_circle_outline,
                      value: '$done',
                      label: 'Commandes récupérées',
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
                if (top.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Produits les plus commandés',
                          style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                        ),
                        const SizedBox(height: 10),
                        for (final e in top.take(3))
                          Padding(
                            padding: const EdgeInsets.only(bottom: 6),
                            child: Row(
                              children: [
                                Expanded(child: Text(e.key)),
                                Text(
                                  '× ${e.value}',
                                  style: const TextStyle(fontWeight: FontWeight.w800),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ],
            ],
          ),
        ),
      ),
    );
  }
}