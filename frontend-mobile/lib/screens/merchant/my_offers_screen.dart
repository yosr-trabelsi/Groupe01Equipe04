import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../models/offer.dart';
import '../../providers/auth_provider.dart';
import '../../services/api_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
import '../../widgets/app_widgets.dart';
import '../../widgets/logout_button.dart';
import 'add_offer_screen.dart';

class MyOffersScreen extends StatefulWidget {
  const MyOffersScreen({super.key});

  @override
  State<MyOffersScreen> createState() => _MyOffersScreenState();
}

class _MyOffersScreenState extends State<MyOffersScreen> {
  List<Offer> _offers = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final uid = context.read<AuthProvider>().user?.uid ?? '';
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final offers = await MerchantService.myOffers(uid);
      if (!mounted) return;
      setState(() {
        _offers = offers;
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

  Future<void> _openForm(Offer? offer) async {
    final saved = await Navigator.push<bool>(
      context,
      MaterialPageRoute(builder: (_) => AddOfferScreen(offer: offer)),
    );
    if (saved == true && mounted) _load();
  }

  Future<void> _delete(Offer o) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Supprimer cette offre ?'),
        content: Text(o.title),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Annuler'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Supprimer'),
          ),
        ],
      ),
    );
    if (ok != true || !mounted) return;
    try {
      await MerchantService.deleteOffer(o.id);
      if (!mounted) return;
      await _load();
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.message)));
    }
  }

  Widget _card(Offer o) {
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
                    o.title,
                    style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                  ),
                ),
                AppBadge(
                  o.isBookable ? 'Disponible' : 'Indisponible',
                  kind: o.isBookable ? BadgeKind.green : BadgeKind.red,
                ),
              ],
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Text(
                  money(o.price),
                  style: const TextStyle(
                    color: AppColors.primary,
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(width: 8),
                if (o.originalPrice > o.price)
                  Text(
                    money(o.originalPrice),
                    style: const TextStyle(
                      color: AppColors.muted,
                      decoration: TextDecoration.lineThrough,
                    ),
                  ),
                const Spacer(),
                if (o.discountPercent > 0)
                  AppBadge('-${o.discountPercent}%', kind: BadgeKind.accent),
              ],
            ),
            const SizedBox(height: 8),
            InfoRow(Icons.inventory_2_outlined, 'Quantité restante : ${o.quantity}'),
            if (o.expirationDate != null)
              InfoRow(Icons.schedule, 'Expire le ${dateLabel(o.expirationDate!)}'),
            Row(
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                TextButton.icon(
                  onPressed: () => _openForm(o),
                  icon: const Icon(Icons.edit_outlined),
                  label: const Text('Modifier'),
                ),
                TextButton.icon(
                  onPressed: () => _delete(o),
                  icon: const Icon(Icons.delete_outline, color: AppColors.danger),
                  label: const Text(
                    'Supprimer',
                    style: TextStyle(color: AppColors.danger),
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
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openForm(null),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle offre'),
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.fromLTRB(16, 20, 16, 96),
            children: [
              PageHeader(
                'Mes offres',
                subtitle: 'Publiez vos invendus à prix réduit',
                trailing: IconButton(
                  tooltip: 'Déconnexion',
                  icon: const Icon(Icons.logout),
                  onPressed: () => confirmLogout(context),
                ),
              ),
              if (_loading && _offers.isEmpty)
                const Center(
                  child: Padding(
                    padding: EdgeInsets.all(40),
                    child: CircularProgressIndicator(color: AppColors.primary),
                  ),
                ),
              if (_error != null) ErrorCard(message: _error!, onRetry: _load),
              if (!_loading && _error == null && _offers.isEmpty)
                const AppCard(child: Text("Aucune offre publiée pour l'instant.")),
              for (final o in _offers) _card(o),
            ],
          ),
        ),
      ),
    );
  }
}