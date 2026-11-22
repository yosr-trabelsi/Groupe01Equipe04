import '../models/order.dart';
import 'api_service.dart';

/// Appels API réservés à l'administrateur (/api/admin/...).
class AdminService {
  static Future<List<Map<String, dynamic>>> users() async {
    final raw = await ApiService.get('/admin/users');
    if (raw is! List) throw ApiException(500, 'Réponse inattendue du serveur (utilisateurs).');
    return raw.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }

  static Future<List<Order>> orders() async {
    final raw = await ApiService.get('/admin/orders');
    if (raw is! List) throw ApiException(500, 'Réponse inattendue du serveur (commandes).');
    return raw
        .whereType<Map>()
        .map((e) => Order.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }

  static Future<void> approveMerchant(String uid) async {
    await ApiService.put('/admin/merchants/$uid/approve', {});
  }

  static Future<void> rejectMerchant(String uid) async {
    await ApiService.put('/admin/merchants/$uid/reject', {});
  }

  static Future<void> setUserActive(String uid, bool isActive) async {
    await ApiService.put('/admin/users/$uid/status', {'isActive': isActive});
  }
}