package com.vivevr.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(LiveStreamingPlugin.class);
    routeTransmitDeepLink(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    routeTransmitDeepLink(intent);
  }

  private void routeTransmitDeepLink(Intent intent) {
    if (intent == null) return;
    Uri data = intent.getData();
    if (data == null) return;

    String key = null;
    if ("https".equalsIgnoreCase(data.getScheme())
      && "vivevr.vercel.app".equalsIgnoreCase(data.getHost())
      && data.getPath() != null
      && data.getPath().startsWith("/transmitir")) {
      key = data.getQueryParameter("key");
    } else if ("onniverso".equalsIgnoreCase(data.getScheme())
      && "open".equalsIgnoreCase(data.getHost())) {
      String inner = data.getQueryParameter("url");
      if (inner != null && !inner.trim().isEmpty()) {
        try {
          Uri innerUri = Uri.parse(inner);
          if ("https".equalsIgnoreCase(innerUri.getScheme())
            && "vivevr.vercel.app".equalsIgnoreCase(innerUri.getHost())
            && innerUri.getPath() != null
            && innerUri.getPath().startsWith("/transmitir")) {
            key = innerUri.getQueryParameter("key");
          }
        } catch (Exception ignored) {
          // ignore malformed deep link payload
        }
      }
    }

    if (key == null || key.trim().isEmpty()) return;
    Intent liveIntent = new Intent(this, LiveStreamingActivity.class);
    liveIntent.putExtra(LiveStreamingActivity.EXTRA_STREAM_KEY, key.trim());
    startActivity(liveIntent);
  }
}
