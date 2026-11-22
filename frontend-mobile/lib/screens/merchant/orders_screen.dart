import 'package:flutter/material.dart';

import '../../models/order.dart';
import '../../services/api_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
import '../../widgets/app_widgets.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  List<Order> _orders = [];
  bool _loading = true;
  String? _error;
  String? _busyId; 

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

  Future<void> _change(Order o, String status, {bool confirm = false}) async {
    if (confirm) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Annuler cette commande ?'),
          content: Text('${o.offerTitle} × ${o.quantity}'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Non'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Oui, annuler'),
            ),
          ],
        ),
      );
      if (ok != true || !mounted) return;
    }
    setState(() => _busyId = o.id);
    try {
      await MerchantService.setOrderStatus(o.id, status);
      if (!mounted) return;
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _busyId = null);
    }
  }

  BadgeKind _kind(Order o) {
    if (o.isCancelled) return BadgeKind.red;
    if (o.isCollected || o.status == 'ready' || o.status == 'confirmed') return BadgeKind.green;
    return BadgeKind.accent;
  }

  Widget _actions(Order o) {
    if (_busyId == o.id) {
      return const Padding(
        padding: EdgeInsets.only(top: 8),
        child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
      );
    }
    if (o.isFinal) return const SizedBox.shrink();
    if (o.status == 'ready') {
      return const Padding(
        padding: EdgeInsets.only(top: 10),
        child: Text(
          "Quand l'étudiant arrive, scannez son QR code (onglet Scanner).",
          style: TextStyle(color: AppColors.muted),
        ),
      );
    }

    final buttons = <Widget>[];
    if (o.status == 'pending') {
      buttons.add(FilledButton(
        onPressed: () => _change(o, 'confirmed'),
        child: const Text('Confirmer'),
      ));
    } else if (o.status == 'confirmed') {
      buttons.add(FilledButton(
        onPressed: () => _change(o, 'ready'),
        child: const Text('Marquer prête'),
      ));
    }
    buttons.add(OutlinedButton(
      onPressed: () => _change(o, 'cancelled', confirm: true),
      child: const Text('Annuler', style: TextStyle(color: AppColors.danger)),
    ));

    return Padding(
      padding: const EdgeInsets.only(top: 10),
      child: Wrap(spacing: 8, runSpacing: 8, children: buttons),
    );
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
            Text(
              '${shortId(o.id)}  ·  Quantité : ${o.quantity}',
              style: const TextStyle(color: AppColors.muted),
            ),
            const SizedBox(height: 6),
            Row(
              children: [
                Text(
                  money(o.totalPrice),
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 10),
                AppBadge(
                  o.isPaid ? 'Payée' : 'Non payée',
                  kind: o.isPaid ? BadgeKind.green : BadgeKind.accent,
                ),
              ],
            ),
            if (o.createdAt != null) ...[
              const SizedBox(height: 6),
              InfoRow(Icons.schedule, dateTimeLabel(o.createdAt!)),
            ],
            _actions(o),
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
              const PageHeader(
                'Commandes',
                subtitle: 'Les réservations de vos clients',
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
              for (final o in _orders) _card(o),
            ],
          ),
        ),
      ),
    );
  }
}