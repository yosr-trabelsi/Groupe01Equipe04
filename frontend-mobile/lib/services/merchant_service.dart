import '../models/offer.dart';
import '../models/order.dart';
import 'api_service.dart';
class MerchantService {
  static Future<List<Offer>> myOffers(String merchantUid) async {
    final raw = await ApiService.get('/offers');
    if (raw is! List) throw ApiException(500, 'Réponse inattendue du serveur (offres).');
    return raw
        .whereType<Map>()
        .map((e) => Offer.fromJson(Map<String, dynamic>.from(e)))
        .where((o) => o.merchantId == merchantUid)
        .toList();
  }

  static Future<void> createOffer(Map<String, dynamic> body) async {
    await ApiService.post('/offers', body);
  }

  static Future<void> updateOffer(String id, Map<String, dynamic> body) async {
    await ApiService.put('/offers/$id', body);
  }
  static Future<void> deleteOffer(String id) async {
    await ApiService.delete('/offers/$id');
  }
  static Future<List<Order>> merchantOrders() async {
    final raw = await ApiService.get('/orders/merchant-orders');
    if (raw is! List) throw ApiException(500, 'Réponse inattendue du serveur (commandes).');
    return raw
        .whereType<Map>()
        .map((e) => Order.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
  static Future<void> setOrderStatus(String orderId, String status) async {
    await ApiService.put('/orders/$orderId/status', {'status': status});
  }
  static Future<String> validateQr(String token) async {
    final r = await ApiService.post('/qr/validate', {'token': token});
    return (r is Map ? r['orderId'] : null)?.toString() ?? '';
  }
}