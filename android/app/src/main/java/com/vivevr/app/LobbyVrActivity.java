package com.vivevr.app;

import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

/**
 * Lobby inmersivo (Tierra / doble ventana): WebView dedicado → {@value #LOBBY_IMMERSIVE_URL}.
 */
public class LobbyVrActivity extends AppCompatActivity {

  public static final String LOBBY_IMMERSIVE_URL = "https://localhost/lobby-inmersivo";

  private WebView webView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    FrameLayout root = new FrameLayout(this);
    root.setLayoutParams(
        new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    root.setBackgroundColor(0xff000000);

    webView = new WebView(this);
    webView.setLayoutParams(
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    configureWebView(webView);
    webView.loadUrl(LOBBY_IMMERSIVE_URL);
    root.addView(webView);

    float density = getResources().getDisplayMetrics().density;
    int margin = (int) (12f * density);
    MaterialButton closeBtn = new MaterialButton(this);
    closeBtn.setText("Cerrar");
    closeBtn.setAllCaps(false);
    FrameLayout.LayoutParams closeLp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeLp.gravity = android.view.Gravity.TOP | android.view.Gravity.END;
    closeLp.setMargins(margin, margin, margin, margin);
    closeBtn.setLayoutParams(closeLp);
    closeBtn.setElevation(24f);
    closeBtn.setOnClickListener(v -> finish());
    root.addView(closeBtn);

    setContentView(root);
  }

  private void configureWebView(WebView wv) {
    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setAllowFileAccess(true);
    settings.setAllowContentAccess(true);
    wv.setWebViewClient(new WebViewClient());
    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            if (request != null && request.getResources() != null) {
              request.grant(request.getResources());
            }
          }
        });
  }

  @Override
  protected void onDestroy() {
    if (webView != null) {
      webView.destroy();
      webView = null;
    }
    super.onDestroy();
  }
}
