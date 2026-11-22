import 'dart:async';
import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import '../utils/constants.dart';

class ApiException implements Exception {
  final int status;
  final String message;
  ApiException(this.status, this.message);

  @override
  String toString() => message;
}

class ApiService {
  static const _timeout = Duration(seconds: 20);

  static Future<Map<String, String>> _headers(bool auth) async {
    final h = {'Content-Type': 'application/json', 'Accept': 'application/json'};
    if (auth) {
      final token = await FirebaseAuth.instance.currentUser?.getIdToken();
      if (token != null) h['Authorization'] = 'Bearer $token';
    }
    return h;
  }

  static String _errorText(dynamic body, int status) {
    if (body is Map) {
      final errors = body['errors'];
      if (errors is List && errors.isNotEmpty) {
        final msgs = errors
            .map((e) => e is Map ? (e['message'] ?? '').toString() : e.toString())
            .where((m) => m.isNotEmpty)
            .toSet()
            .toList();
        if (msgs.isNotEmpty) return msgs.join('\n');
      }
      final m = body['error'] ?? body['message'];
      if (m != null && m.toString().isNotEmpty) return m.toString();
    }
    return 'Erreur serveur ($status)';
  }

  static Future<dynamic> request(
    String method,
    String path, {
    Map<String, dynamic>? body,
    bool auth = true,
  }) async {
    final uri = Uri.parse('${AppConfig.apiUrl}$path');
    try {
      final headers = await _headers(auth);
      final http.Response r;
      switch (method) {
        case 'GET':
          r = await http.get(uri, headers: headers).timeout(_timeout);
          break;
        case 'POST':
          r = await http.post(uri, headers: headers, body: jsonEncode(body ?? {})).timeout(_timeout);
          break;
        case 'PUT':
          r = await http.put(uri, headers: headers, body: jsonEncode(body ?? {})).timeout(_timeout);
          break;
        case 'DELETE':
          r = await http.delete(uri, headers: headers).timeout(_timeout);
          break;
        default:
          throw ArgumentError('Méthode non supportée : $method');
      }

      dynamic decoded;
      if (r.body.isNotEmpty) {
        try {
          decoded = jsonDecode(utf8.decode(r.bodyBytes));
        } catch (_) {}
      }
      if (r.statusCode >= 200 && r.statusCode < 300) return decoded;
      throw ApiException(r.statusCode, _errorText(decoded, r.statusCode));
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw ApiException(0, 'Le serveur ne répond pas. Réessayez.');
    } catch (_) {
      throw ApiException(0, 'Serveur injoignable : vérifiez que le backend est lancé et l’adresse de l’API.');
    }
  }

  static Future<dynamic> get(String path, {bool auth = true}) => request('GET', path, auth: auth);

  static Future<dynamic> post(String path, Map<String, dynamic> body, {bool auth = true}) =>
      request('POST', path, body: body, auth: auth);

  static Future<dynamic> put(String path, Map<String, dynamic> body) => request('PUT', path, body: body);

  static Future<dynamic> delete(String path) => request('DELETE', path);
}