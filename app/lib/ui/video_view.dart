import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:material_ui/material_ui.dart';
import 'package:video_player/video_player.dart';

import '../core/providers.dart';

/// Plays a video only after a tap (saves mobile data).
class TapToPlayVideo extends ConsumerStatefulWidget {
  const TapToPlayVideo({super.key, required this.url});

  final String url;

  @override
  ConsumerState<TapToPlayVideo> createState() => _TapToPlayVideoState();
}

class _TapToPlayVideoState extends ConsumerState<TapToPlayVideo> {
  VideoPlayerController? _controller;
  bool _loading = false;
  bool _failed = false;

  Future<void> _start() async {
    setState(() => _loading = true);
    final url = ref.read(apiClientProvider).absolute(widget.url);
    final controller = VideoPlayerController.networkUrl(Uri.parse(url));
    try {
      await controller.initialize();
      await controller.play();
      if (!mounted) {
        await controller.dispose();
        return;
      }
      setState(() {
        _controller = controller;
        _loading = false;
      });
    } catch (_) {
      await controller.dispose();
      if (mounted) {
        setState(() {
          _failed = true;
          _loading = false;
        });
      }
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = _controller;
    if (c != null) {
      return GestureDetector(
        onTap: () => setState(() => c.value.isPlaying ? c.pause() : c.play()),
        child: Center(child: AspectRatio(aspectRatio: c.value.aspectRatio, child: VideoPlayer(c))),
      );
    }
    return ColoredBox(
      color: Colors.black,
      child: Center(
        child: _loading
            ? const CircularProgressIndicator()
            : IconButton.filled(
                iconSize: 40,
                onPressed: _failed ? null : _start,
                icon: Icon(_failed ? Icons.error_outline : Icons.play_arrow_rounded),
              ),
      ),
    );
  }
}
