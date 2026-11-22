import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

import '../../services/api_service.dart';
import '../../services/merchant_service.dart';
import '../../utils/constants.dart';
import '../../utils/merchant_helpers.dart';
import '../../widgets/app_widgets.dart';

class QrScannerScreen extends StatefulWidget {
  const QrScannerScreen({super.key});

  @override
  State<QrScannerScreen> createState() => _QrScannerScreenState();
}

class _QrScannerScreenState extends State<QrScannerScreen> {
  final MobileScannerController _controller = MobileScannerController(
    formats: const [BarcodeFormat.qrCode],
    detectionSpeed: DetectionSpeed.noDuplicates,
  );
  final TextEditingController _manual = TextEditingController();

  bool _busy = false;
  bool? _success; // null = rien à afficher
  String _message = '';

  @override
  void dispose() {
    _controller.dispose();
    _manual.dispose();
    super.dispose();
  }

  Future<void> _validate(String raw) async {
    final token = raw.trim();
    if (token.isEmpty || _busy) return;
    setState(() {
      _busy = true;
      _success = null;
    });
    try {
      final orderId = await MerchantService.validateQr(token);
      if (!mounted) return;
      setState(() {
        _success = true;
        _message = orderId.isEmpty
            ? 'Commande validée. Remettez les produits au client.'
            : 'Commande ${shortId(orderId)} validée. Remettez les produits au client.';
      });
      _manual.clear();
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() {
        _success = false;
        _message = e.message;
      });
    }
  }

  void _reset() {
    setState(() {
      _busy = false;
      _success = null;
      _message = '';
    });
  }

  Widget _resultCard() {
    final ok = _success == true;
    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: AppCard(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  ok ? Icons.check_circle : Icons.error_outline,
                  color: ok ? AppColors.primary : AppColors.danger,
                ),
                const SizedBox(width: 8),
                Text(
                  ok ? 'Validé' : 'Refusé',
                  style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(_message),
            const SizedBox(height: 12),
            FilledButton(
              onPressed: _reset,
              child: const Text('Scanner un autre QR code'),
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
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 20, 16, 24),
          children: [
            const PageHeader(
              'Scanner',
              subtitle: "Scannez le QR code de l'étudiant",
            ),
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                height: 300,
                child: MobileScanner(
                  controller: _controller,
                  onDetect: (capture) {
                    if (_busy) return;
                    for (final b in capture.barcodes) {
                      final v = b.rawValue;
                      if (v != null && v.isNotEmpty) {
                        _validate(v);
                        break;
                      }
                    }
                  },
                ),
              ),
            ),
            if (_busy && _success == null)
              const Padding(
                padding: EdgeInsets.only(top: 16),
                child: Center(child: CircularProgressIndicator(color: AppColors.primary)),
              ),
            if (_success != null) _resultCard(),
            const SizedBox(height: 20),
            AppCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Saisie manuelle (tests)',
                    style: TextStyle(fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Collez ici le contenu du QR code si la caméra ne marche pas.',
                    style: TextStyle(color: AppColors.muted),
                  ),
                  const SizedBox(height: 10),
                  TextField(
                    controller: _manual,
                    decoration: const InputDecoration(
                      labelText: 'Contenu du QR',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 10),
                  FilledButton(
                    onPressed: _busy ? null : () => _validate(_manual.text),
                    child: const Text('Valider'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}