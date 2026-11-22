import '../utils/parsers.dart';
class AppUser {
  final String uid, email, name, role;
  final String? phone, status;
  final int? ecoPoints;

  const AppUser({
    required this.uid,
    required this.email,
    required this.name,
    required this.role,
    this.phone,
    this.status,
    this.ecoPoints,
  });

  bool get isStudent => role == 'student';
  bool get isMerchant => role == 'merchant';

  factory AppUser.fromJson(Map<String, dynamic> j) => AppUser(
        uid: str(j['uid'] ?? j['id']),
        email: str(j['email']),
        name: str(j['name'] ?? j['displayName'] ?? j['fullName']),
        role: str(j['role']),
        phone: j['phone']?.toString(),
        status: j['status']?.toString(),
        ecoPoints: j['ecoPoints'] == null ? null : toInt(j['ecoPoints']),
      );

  AppUser copyWith({String? name, String? phone}) => AppUser(
        uid: uid,
        email: email,
        name: name ?? this.name,
        role: role,
        phone: phone ?? this.phone,
        status: status,
        ecoPoints: ecoPoints,
      );
}