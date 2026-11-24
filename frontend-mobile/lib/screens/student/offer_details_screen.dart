import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/offer.dart';
import '../../providers/offers_provider.dart';
import '../../providers/orders_provider.dart';
import '../../services/api_service.dart';
import '../../utils/constants.dart';
import '../../utils/format.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/offer_card.dart';

class OfferDetailsScreen extends StatefulWidget {
  final Offer offer;
  const OfferDetailsScreen({super.key, required this.offer});
  @override
  State<OfferDetailsScreen> createState() => _OfferDetailsScreenState();
}

class _OfferDetailsScreenState extends State<OfferDetailsScreen> {
  int _qty = 1;
  bool _busy = false;
  String? _error;

  Offer get o => widget.offer;
  int get _max => o.quantity.clamp(1, 20).toInt();

  Future<void> _reserve() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final orders = context.read<OrdersProvider>();
      final offers = context.read<OffersProvider>();
      // POST /api/orders : réservation (stock décrémenté côté serveur dans une transaction).
      // Le commerçant est notifié ; le paiement se fait après son acceptation.
      await orders.create(o.id, _qty);
      offers.load(); // met à jour le stock affiché
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            "Réservation envoyée. Le commerçant doit l'accepter : tu seras notifié, "
            'puis tu pourras payer dans « Mes commandes ».',
          ),
          duration: Duration(seconds: 5),
        ),
      );
      Navigator.pop(context);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _busy = false;
        _error = e.message;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final pickup = pickupText(o), expiry = expirationText(o);
    return Scaffold(
      body: CustomScrollView(slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 220,
          backgroundColor: AppColors.bg,
          flexibleSpace: FlexibleSpaceBar(background: OfferImage(o, height: 260)),
        ),
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Center(
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 640),
                child: AppCard(
                  padding: const EdgeInsets.all(22),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Row(mainAxisAlignment: MainAxisAlignment.spaceBetween, children: [
                      AppBadge('-${o.discountPercent}%', kind: BadgeKind.orange),
                      AppBadge('${o.quantity} restant(s)', kind: o.quantity > 0 ? BadgeKind.green : BadgeKind.red),
                    ]),
                    const SizedBox(height: 14),
                    Text(o.title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
                    const SizedBox(height: 6),
                    InfoRow(Icons.storefront_outlined,
                        '${o.businessName.isEmpty ? 'Commerce' : o.businessName} · ${categoryLabel(o.category)}'),
                    const SizedBox(height: 4),
                    Row(crossAxisAlignment: CrossAxisAlignment.end, children: [
                      Text(formatPrice(o.price),
                          style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w800, color: AppColors.primary)),
                      const SizedBox(width: 10),
                      Padding(
                        padding: const EdgeInsets.only(bottom: 5),
                        child: Text(formatPrice(o.originalPrice),
                            style: const TextStyle(color: AppColors.muted, decoration: TextDecoration.lineThrough)),
                      ),
                    ]),
                    const SizedBox(height: 14),
                    if (pickup.isNotEmpty) InfoRow(Icons.schedule, pickup),
                    if (expiry.isNotEmpty) InfoRow(Icons.event_outlined, expiry),
                    if (o.description.isNotEmpty) ...[
                      const SizedBox(height: 10),
                      Text(o.description, style: const TextStyle(height: 1.4)),
                    ],
                    const Divider(height: 32, color: AppColors.border),
                    Row(children: [
                      const Text('Quantité', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
                      const Spacer(),
                      IconButton.outlined(
                          onPressed: _qty > 1 ? () => setState(() => _qty--) : null, icon: const Icon(Icons.remove)),
                      SizedBox(
                          width: 44,
                          child: Center(child: Text('$_qty', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)))),
                      IconButton.outlined(
                          onPressed: _qty < _max ? () => setState(() => _qty++) : null, icon: const Icon(Icons.add)),
                    ]),
                    const SizedBox(height: 6),
                    Text('Total : ${formatPrice(o.price * _qty)}',
                        style: const TextStyle(color: AppColors.muted, fontWeight: FontWeight.w600)),
                    const SizedBox(height: 6),
                    const Text(
                      "Tu paieras après l'acceptation de ta réservation par le commerçant.",
                      style: TextStyle(color: AppColors.muted, fontSize: 12),
                    ),
                    if (_error != null) ...[
                      const SizedBox(height: 12),
                      AppBadge(_error!, kind: BadgeKind.red),
                    ],
                  ]),
                ),
              ),
            ),
          ),
        ),
      ]),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: PrimaryButton(
            label: 'Réserver · ${formatPrice(o.price * _qty)}',
            icon: Icons.shopping_bag_outlined,
            loading: _busy,
            onPressed: o.isBookable ? _reserve : null,
          ),
        ),
      ),
    );
  }
}