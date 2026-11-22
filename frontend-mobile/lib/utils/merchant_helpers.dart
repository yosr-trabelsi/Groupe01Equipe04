import 'package:intl/intl.dart';
String money(double v) {
  var s = v.toStringAsFixed(3);
  s = s.replaceFirst(RegExp(r'0+$'), '').replaceFirst(RegExp(r'\.$'), '');
  return '${s.replaceAll('.', ',')} TND';
}

String dateLabel(DateTime d) => DateFormat('dd/MM/yyyy').format(d);

String dateTimeLabel(DateTime d) => DateFormat('dd/MM/yyyy HH:mm').format(d);

String shortId(String id) =>
    '#${(id.length > 6 ? id.substring(0, 6) : id).toUpperCase()}';