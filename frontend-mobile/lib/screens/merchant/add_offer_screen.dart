import 'package:flutter/material.dart';

import '../../models/offer.dart';
import '../../services/api_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
class AddOfferScreen extends StatefulWidget {
  final Offer? offer;
  const AddOfferScreen({super.key, this.offer});

  @override
  State<AddOfferScreen> createState() => _AddOfferScreenState();
}

class _AddOfferScreenState extends State<AddOfferScreen> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _title;
  late final TextEditingController _description;
  late final TextEditingController _originalPrice;
  late final TextEditingController _price;
  late final TextEditingController _quantity;
  DateTime? _expiration;
  bool _saving = false;

  bool get _isEdit => widget.offer != null;

  @override
  void initState() {
    super.initState();
    final o = widget.offer;
    _title = TextEditingController(text: o?.title ?? '');
    _description = TextEditingController(text: o?.description ?? '');
    _originalPrice = TextEditingController(text: o == null ? '' : _num(o.originalPrice));
    _price = TextEditingController(text: o == null ? '' : _num(o.price));
    _quantity = TextEditingController(text: o == null ? '' : o.quantity.toString());
    _expiration = o?.expirationDate;
  }

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _originalPrice.dispose();
    _price.dispose();
    _quantity.dispose();
    super.dispose();
  }

  String _num(double v) {
    var s = v.toStringAsFixed(3);
    s = s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
    return s;
  }

  double _parse(String v) => double.tryParse(v.trim().replaceAll(',', '.')) ?? 0;

  void _snack(String m) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final init = _expiration ?? today.add(const Duration(days: 1));
    final first = init.isBefore(today) ? DateTime(init.year, init.month, init.day) : today;
    final d = await showDatePicker(
      context: context,
      initialDate: init,
      firstDate: first,
      lastDate: today.add(const Duration(days: 365)),
    );
    if (d != null && mounted) setState(() => _expiration = d);
  }

  String? _vTitle(String? v) {
    final t = v?.trim() ?? '';
    return t.length < 3 ? 'Au moins 3 caractères' : null;
  }

  String? _vOriginal(String? v) => _parse(v ?? '') > 0 ? null : 'Prix invalide';

  String? _vPrice(String? v) {
    final p = _parse(v ?? '');
    if (p <= 0) return 'Prix invalide';
    final o = _parse(_originalPrice.text);
    if (o > 0 && p >= o) return 'Doit être inférieur au prix initial';
    return null;
  }

  String? _vQuantity(String? v) {
    final q = int.tryParse(v?.trim() ?? '');
    return (q == null || q < 1) ? 'Quantité minimale : 1' : null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final exp = _expiration;
    if (exp == null) {
      _snack("Choisissez la date d'expiration");
      return;
    }
    final d = exp;
    final dateStr =
        '${d.year.toString().padLeft(4, '0')}-${d.month.toString().padLeft(2, '0')}-${d.day.toString().padLeft(2, '0')}';

    final body = <String, dynamic>{
      'title': _title.text.trim(),
      'description': _description.text.trim(),
      'price': _parse(_price.text),
      'originalPrice': _parse(_originalPrice.text),
      'quantity': int.parse(_quantity.text.trim()),
      'expirationDate': dateStr,
    };

    setState(() => _saving = true);
    try {
      if (_isEdit) {
        await MerchantService.updateOffer(widget.offer!.id, body);
      } else {
        await MerchantService.createOffer(body);
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } on ApiException catch (e) {
      _snack(e.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEdit ? "Modifier l'offre" : 'Nouvelle offre')),
      body: AbsorbPointer(
        absorbing: _saving,
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              TextFormField(
                controller: _title,
                decoration: const InputDecoration(
                  labelText: 'Nom du produit',
                  border: OutlineInputBorder(),
                ),
                validator: _vTitle,
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _description,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Description (facultatif)',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _originalPrice,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Prix initial (TND)',
                        border: OutlineInputBorder(),
                      ),
                      validator: _vOriginal,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: TextFormField(
                      controller: _price,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: const InputDecoration(
                        labelText: 'Prix réduit (TND)',
                        border: OutlineInputBorder(),
                      ),
                      validator: _vPrice,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              TextFormField(
                controller: _quantity,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Quantité disponible',
                  border: OutlineInputBorder(),
                ),
                validator: _vQuantity,
              ),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: _pickDate,
                icon: const Icon(Icons.event),
                label: Text(_expiration == null
                    ? "Date d'expiration"
                    : "Expire le ${dateLabel(_expiration!)}"),
              ),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: _saving ? null : _submit,
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                  backgroundColor: AppColors.primary,
                ),
                child: _saving
                    ? const SizedBox(
                        width: 22,
                        height: 22,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(_isEdit ? 'Enregistrer' : "Publier l'offre"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}