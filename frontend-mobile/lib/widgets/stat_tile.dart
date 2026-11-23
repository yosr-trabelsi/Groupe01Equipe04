import 'package:flutter/material.dart';

import '../utils/constants.dart';
import 'app_widgets.dart';
class StatTile extends StatelessWidget {
  final IconData icon;
  final String value;
  final String label;
  final Color? color;

  const StatTile({
    super.key,
    required this.icon,
    required this.value,
    required this.label,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color ?? AppColors.primary),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: const TextStyle(color: AppColors.muted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}
class StatGrid extends StatelessWidget {
  final List<Widget> tiles;

  const StatGrid({super.key, required this.tiles});

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    for (var i = 0; i < tiles.length; i += 2) {
      rows.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(child: tiles[i]),
              const SizedBox(width: 12),
              Expanded(
                child: i + 1 < tiles.length ? tiles[i + 1] : const SizedBox.shrink(),
              ),
            ],
          ),
        ),
      );
    }
    return Column(children: rows);
  }
}
class BreakdownRow extends StatelessWidget {
  final String label;
  final int count;
  final int total;
  final Color color;

  const BreakdownRow({
    super.key,
    required this.label,
    required this.count,
    required this.total,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(label)),
              Text('$count', style: const TextStyle(fontWeight: FontWeight.w800)),
            ],
          ),
          const SizedBox(height: 4),
          ClipRRect(
            borderRadius: BorderRadius.circular(6),
            child: LinearProgressIndicator(
              value: total == 0 ? 0 : count / total,
              minHeight: 8,
              color: color,
              backgroundColor: Colors.black12,
            ),
          ),
        ],
      ),
    );
  }
}