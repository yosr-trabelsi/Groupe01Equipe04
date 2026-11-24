import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/order.dart';
import '../../providers/orders_provider.dart';
import '../../utils/constants.dart';
import '../../utils/format.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/logout_button.dart';
import 'home_screen.dart';
import 'order_qr_screen.dart';
import 'payment_screen.dart';

BadgeKind statusKind(Order o) {
  if (o.isCancelled) return BadgeKind.red;
  if (o.isCollected || o.status == OrderStatus.ready || o.status == OrderStatus.confirmed) return BadgeKind.green;
  return BadgeKind.orange;
}

class StatusBadge extends StatelessWidget {
  final Order order;
  const StatusBadge(this.order, {super.key});
  @override
  Widget build(BuildContext context) => AppBadge(order.statusLabel, kind: statusKind(order));
}

class MyOrdersScreen extends StatelessWidget {
  const MyOrdersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final p = context.watch<OrdersProvider>();
    return SafeArea(
      bottom: false,
      child: RefreshIndicator(
        color: AppColors.primary,
        onRefresh: p.load,
        child: LayoutBuilder(builder: (context, c) {
          final pad = pagePadding(c.maxWidth);
          Widget content;
          if (p.loading && p.orders.isEmpty && p.error == null) {
            content = const Padding(
              padding: EdgeInsets.only(top: 60),
              child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
            );
          } else if (p.error != null && p.orders.isEmpty) {
            content = ErrorCard(message: p.error!, onRetry: p.load);
          } else if (p.orders.isEmpty) {
            content = const AppCard(child: Text('Aucune réservation pour le moment.'));
          } else {
            content = Column(children: [
              for (final o in p.orders) Padding(padding: const EdgeInsets.only(bottom: 14), child: _OrderCard(order: o)),
            ]);
          }
          return ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: pad,
            children: [
              PageHeader('Mes commandes',
                  subtitle: '${p.orders.length} réservation(s)',
                  trailing: c.maxWidth >= 800 ? null : const LogoutButton()),
              Align(alignment: Alignment.topCenter, child: ConstrainedBox(constraints: const BoxConstraints(maxWidth: 760), child: content)),
            ],
          );
        }),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  const _OrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final o = order;
    // Flux : réservation -> acceptation du commerçant -> paiement.
    final waitingMerchant = o.status == 'pending' && !o.isFinal && !o.isPaid;
    final canPay = o.needsPayment && o.status == 'confirmed';
    final showPayBadge = !o.isFinal && (o.isPaid || o.status != 'pending');
    return AppCard(
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(o.offerTitle.isEmpty ? 'Commande' : o.offerTitle,
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
              if (o.businessName.isNotEmpty)
                Text(o.businessName, style: const TextStyle(color: AppColors.muted, fontSize: 13)),
            ]),
          ),
          const SizedBox(width: 8),
          StatusBadge(o),
        ]),
        const SizedBox(height: 12),
        Row(children: [
          Text('Qté ${o.quantity}', style: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600)),
          const SizedBox(width: 16),
          Text(formatPrice(o.totalPrice), style: const TextStyle(fontWeight: FontWeight.w800)),
          const Spacer(),
          if (showPayBadge)
            AppBadge(o.isPaid ? 'Payée' : (o.paymentStatus == 'pending' ? 'Paiement en cours' : 'À payer'),
                kind: o.isPaid ? BadgeKind.green : BadgeKind.accent),
        ]),
        if (o.createdAt != null)
          Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Text(formatDateTime(o.createdAt!), style: const TextStyle(color: AppColors.muted, fontSize: 12)),
          ),
        if (waitingMerchant)
          const Padding(
            padding: EdgeInsets.only(top: 10),
            child: Text(
              'En attente de la réponse du commerçant. Tu seras notifié.',
              style: TextStyle(color: AppColors.muted, fontSize: 13),
            ),
          ),
        if (canPay || o.hasQr) const SizedBox(height: 14),
        if (canPay)
          PrimaryButton(
            label: 'Payer',
            icon: Icons.credit_card,
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => PaymentScreen(orderId: o.id, title: o.offerTitle))),
          ),
        if (o.hasQr)
          PrimaryButton(
            label: 'Afficher mon QR code',
            icon: Icons.qr_code_2,
            onPressed: () => Navigator.push(context,
                MaterialPageRoute(builder: (_) => OrderQrScreen(orderId: o.id, title: o.offerTitle))),
          ),
      ]),
    );
  }
}