package com.vivevr.app;

import android.net.Uri;

/** Resuelve playback_url / playback_id Mux a URL reproducible en ExoPlayer. */
public final class StreamUrlResolver {

  private StreamUrlResolver() {}

  public static String resolve(String playbackUrl, String playbackId) {
    if (playbackUrl != null && !playbackUrl.trim().isEmpty()) {
      return playbackUrl.trim();
    }
    if (playbackId != null && !playbackId.trim().isEmpty()) {
      return "https://stream.mux.com/" + playbackId.trim() + ".m3u8";
    }
    return "";
  }

  public static boolean isPlayableHttpUrl(String value) {
    if (value == null || value.isEmpty()) {
      return false;
    }
    String v = value.trim().toLowerCase();
    return v.startsWith("http://")
        || v.startsWith("https://")
        || v.endsWith(".m3u8")
        || v.contains(".m3u8?")
        || v.endsWith(".mp4")
        || v.contains(".mp4?");
  }

  public static String extractMuxPlaybackIdFromHls(String url) {
    if (url == null || url.isEmpty()) {
      return "";
    }
    try {
      String segment = Uri.parse(url.trim()).getLastPathSegment();
      if (segment == null || segment.isEmpty()) {
        return "";
      }
      if (segment.endsWith(".m3u8")) {
        return segment.substring(0, segment.length() - 5);
      }
      return segment;
    } catch (Exception ignored) {
      return "";
    }
  }
}
