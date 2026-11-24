import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';

import '../core/providers.dart';
import 'media_placeholder.dart';

/// Picture from the server with a disk cache.
/// Links are signed and change over time, so the cache key is the file id:
/// a photo is downloaded once and then shown from the phone (slow internet!).
class NetImage extends ConsumerWidget {
  const NetImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.placeholderIcon = Icons.image_outlined,
    this.seed = '',
    this.memCacheWidth,
  });

  final String? url;
  final BoxFit fit;
  final IconData placeholderIcon;
  final String seed;

  /// Decode smaller images for thumbnails (saves memory).
  final int? memCacheWidth;

  static String cacheKeyOf(String url) {
    final match = RegExp(r'/media/([0-9a-f-]{36})').firstMatch(url);
    return match?.group(1) ?? url.split('?').first;
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final u = url;
    final placeholder = MediaPlaceholder(seed: seed.isEmpty ? (u ?? 'x') : seed, icon: placeholderIcon);
    if (u == null || u.isEmpty) return placeholder;
    final full = ref.watch(apiClientProvider).absolute(u);
    return CachedNetworkImage(
      imageUrl: full,
      cacheKey: cacheKeyOf(u),
      fit: fit,
      memCacheWidth: memCacheWidth,
      fadeInDuration: const Duration(milliseconds: 150),
      placeholder: (_, _) => placeholder,
      errorWidget: (_, _, _) => placeholder,
    );
  }
}
