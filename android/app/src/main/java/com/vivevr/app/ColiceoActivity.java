package com.vivevr.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

import org.json.JSONObject;

/**
 * Sala Coliseo 360° — WebView de la ruta {@value #COLOSSEO_PAGE_URL} + overlay nativo YouTube
 * sobre el slot {@code #coliseo-browser-screen}.
 */
public class ColiceoActivity extends AppCompatActivity {

  public static final String COLOSSEO_PAGE_URL = "https://onnivers.com/coliseo";

  private static final String COLOSSEO_BROWSER_DEFAULT_URL = "https://www.youtube.com/";
  private static final String COLOSSEO_BROWSER_DESKTOP_UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

  private FrameLayout root;
  private WebView contentWebView;
  private WebView coliseoBrowserWebView;
  private String initialColiseoUrl = COLOSSEO_BROWSER_DEFAULT_URL;
  private String initialColiseoPlaybackId = "";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    resolveInitialPayloadFromIntent();

    root = new FrameLayout(this);
    root.setLayoutParams(
        new ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    root.setBackgroundColor(0xff000000);

    contentWebView = new WebView(this);
    contentWebView.setLayoutParams(
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    configureContentWebView(contentWebView);
    contentWebView.addJavascriptInterface(new ColiceoJsApi(), "Android");
    contentWebView.loadUrl(COLOSSEO_PAGE_URL);
    root.addView(contentWebView);

    float density = getResources().getDisplayMetrics().density;
    int margin = (int) (12f * density);
    MaterialButton closeBtn = new MaterialButton(this);
    closeBtn.setText("Cerrar");
    closeBtn.setAllCaps(false);
    FrameLayout.LayoutParams closeLp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    closeLp.gravity = Gravity.TOP | Gravity.END;
    closeLp.setMargins(margin, margin, margin, margin);
    closeBtn.setLayoutParams(closeLp);
    closeBtn.setElevation(24f);
    closeBtn.setOnClickListener(v -> finish());
    root.addView(closeBtn);

    setContentView(root);
  }

  private void resolveInitialPayloadFromIntent() {
    Intent intent = getIntent();
    if (intent == null) {
      return;
    }
    String streamUrl = intent.getStringExtra(StreamExtras.STREAM_URL);
    String playbackUrl = intent.getStringExtra(StreamExtras.PLAYBACK_URL);
    String playbackId = intent.getStringExtra(StreamExtras.PLAYBACK_ID);
    String urlCandidate =
        streamUrl != null && !streamUrl.trim().isEmpty() ? streamUrl.trim() : playbackUrl;
    String resolved = StreamUrlResolver.resolve(urlCandidate, playbackId);
    if (!resolved.isEmpty()) {
      initialColiseoUrl = resolved;
    }
    if (playbackId != null && !playbackId.trim().isEmpty()) {
      initialColiseoPlaybackId = playbackId.trim();
    } else {
      String extracted = StreamUrlResolver.extractMuxPlaybackIdFromHls(initialColiseoUrl);
      if (!extracted.isEmpty()) {
        initialColiseoPlaybackId = extracted;
      }
    }
  }

  @Override
  protected void onDestroy() {
    destroyColiseoBrowserWebViewIfPresent();
    if (contentWebView != null) {
      contentWebView.destroy();
      contentWebView = null;
    }
    super.onDestroy();
  }

  private void configureContentWebView(WebView wv) {
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

  private void ensureColiseoBrowserWebViewCreated() {
    if (coliseoBrowserWebView != null) {
      return;
    }
    View existing = root.findViewWithTag("coliseo_browser_wv");
    if (existing instanceof WebView) {
      coliseoBrowserWebView = (WebView) existing;
      return;
    }

    WebView wv = new WebView(this);
    wv.setTag("coliseo_browser_wv");
    FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(1, 1);
    lp.gravity = Gravity.TOP | Gravity.START;
    wv.setLayoutParams(lp);
    wv.setVisibility(View.GONE);
    wv.setElevation(10001f);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      wv.setZ(10001f);
    }
    wv.setBackgroundColor(0xff0f0f0f);

    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setLoadWithOverviewMode(true);
    settings.setUseWideViewPort(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setUserAgentString(COLOSSEO_BROWSER_DESKTOP_UA);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }
    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            if (request != null && request.getResources() != null) {
              request.grant(request.getResources());
            }
          }
        });
    wv.setWebViewClient(new WebViewClient());
    coliseoBrowserWebView = wv;
    root.addView(wv);
  }

  private void attachAndShowColiseoBrowserWebView() {
    ensureColiseoBrowserWebViewCreated();
    if (coliseoBrowserWebView == null) {
      return;
    }
    loadColiseoBrowserUrlInternal(initialColiseoUrl);
    updateColiseoBrowserBounds();
    scheduleColiseoBrowserBoundsRetries();
    coliseoBrowserWebView.bringToFront();
    root.requestLayout();
  }

  private void openSelectorInternal(String maybeUrlOrPlaybackId, String preferredScene) {
    String raw = maybeUrlOrPlaybackId != null ? maybeUrlOrPlaybackId.trim() : "";
    String streamUrl = "";
    String playbackId = initialColiseoPlaybackId;
    if (!raw.isEmpty()) {
      if (StreamUrlResolver.isPlayableHttpUrl(raw)) {
        streamUrl = raw;
        String extracted = StreamUrlResolver.extractMuxPlaybackIdFromHls(raw);
        if (!extracted.isEmpty()) {
          playbackId = extracted;
        }
      } else {
        playbackId = raw;
      }
    } else if (StreamUrlResolver.isPlayableHttpUrl(initialColiseoUrl)) {
      streamUrl = initialColiseoUrl;
    }

    String resolved = StreamUrlResolver.resolve(streamUrl, playbackId);
    if (resolved.isEmpty()) {
      Toast.makeText(this, "No hay URL para abrir el selector.", Toast.LENGTH_SHORT).show();
      return;
    }
    Intent selectorIntent = new Intent(this, SelectorActivity.class);
    selectorIntent.putExtra(
        SelectorActivity.EXTRA_PREFERRED_SCENE,
        preferredScene != null && !preferredScene.trim().isEmpty() ? preferredScene.trim() : "split");
    selectorIntent.putExtra(StreamExtras.STREAM_URL, resolved);
    selectorIntent.putExtra(StreamExtras.PLAYBACK_URL, resolved);
    if (playbackId != null && !playbackId.isEmpty()) {
      selectorIntent.putExtra(StreamExtras.PLAYBACK_ID, playbackId);
    }
    startActivity(selectorIntent);
  }

  private void scheduleColiseoBrowserBoundsRetries() {
    if (coliseoBrowserWebView == null) {
      return;
    }
    final int[] delaysMs = {80, 200, 450, 900, 1800, 3000};
    for (int delay : delaysMs) {
      coliseoBrowserWebView.postDelayed(this::updateColiseoBrowserBounds, delay);
    }
  }

  private void updateColiseoBrowserBounds() {
    if (coliseoBrowserWebView == null || contentWebView == null) {
      return;
    }
    final String rectJs =
        "(window.__onniversoGetColiseoBrowserRect&&window.__onniversoGetColiseoBrowserRect())";
    String code =
        "(function(){try{var r="
            + rectJs
            + ";if(!r)return null;return JSON.stringify(r);}catch(e){return null;}})();";
    contentWebView.evaluateJavascript(
        code,
        value ->
            runOnUiThread(
                () -> {
                  JSONObject rect = parseEvaluateJsonObject(value);
                  if (rect == null) {
                    return;
                  }
                  try {
                    float scale = contentWebView.getScale();
                    int w = (int) (rect.getInt("w") * scale + 0.5f);
                    int h = (int) (rect.getInt("h") * scale + 0.5f);
                    int x = (int) (rect.getInt("x") * scale + 0.5f);
                    int y = (int) (rect.getInt("y") * scale + 0.5f);
                    if (w < 48 || h < 48) {
                      return;
                    }
                    FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(w, h);
                    lp.leftMargin = x;
                    lp.topMargin = y;
                    lp.gravity = Gravity.TOP | Gravity.START;
                    coliseoBrowserWebView.setLayoutParams(lp);
                    coliseoBrowserWebView.setVisibility(View.VISIBLE);
                    coliseoBrowserWebView.bringToFront();
                  } catch (Exception ignored) {
                    // ignore malformed rect
                  }
                }));
  }

  private void hideColiseoBrowserWebViewInternal() {
    if (coliseoBrowserWebView != null) {
      coliseoBrowserWebView.setVisibility(View.GONE);
    }
  }

  private void loadColiseoBrowserUrlInternal(String url) {
    ensureColiseoBrowserWebViewCreated();
    if (coliseoBrowserWebView == null) {
      return;
    }
    String target = url != null ? url.trim() : "";
    if (target.isEmpty()) {
      target = COLOSSEO_BROWSER_DEFAULT_URL;
    }
    if (target.contains("m.youtube.com")) {
      target = target.replace("m.youtube.com", "www.youtube.com");
    }
    coliseoBrowserWebView.loadUrl(target);
  }

  private void destroyColiseoBrowserWebViewIfPresent() {
    if (coliseoBrowserWebView == null) {
      return;
    }
    root.removeView(coliseoBrowserWebView);
    coliseoBrowserWebView.destroy();
    coliseoBrowserWebView = null;
  }

  private JSONObject parseEvaluateJsonObject(String value) {
    if (value == null || value.isEmpty() || "null".equals(value)) {
      return null;
    }
    try {
      String json = value.trim();
      if (json.startsWith("\"") && json.endsWith("\"")) {
        json = new org.json.JSONTokener(json).nextValue().toString();
      }
      return new JSONObject(json);
    } catch (Exception e) {
      return null;
    }
  }

  private final class ColiceoJsApi {
    @JavascriptInterface
    public void showColiseoBrowserWebView() {
      runOnUiThread(ColiceoActivity.this::attachAndShowColiseoBrowserWebView);
    }

    @JavascriptInterface
    public void hideColiseoBrowserWebView() {
      runOnUiThread(ColiceoActivity.this::hideColiseoBrowserWebViewInternal);
    }

    @JavascriptInterface
    public void updateColiseoBrowserBounds() {
      runOnUiThread(ColiceoActivity.this::updateColiseoBrowserBounds);
    }

    @JavascriptInterface
    public void loadColiseoBrowserUrl(String url) {
      runOnUiThread(
          () -> {
            String target = url != null ? url.trim() : "";
            if (!target.isEmpty()) {
              initialColiseoUrl = target;
            }
            loadColiseoBrowserUrlInternal(target);
          });
    }

    /** Compat con páginas que invocan {@code window.Android.openSelector(...)}. */
    @JavascriptInterface
    public void openSelector() {
      runOnUiThread(() -> openSelectorInternal("", "split"));
    }

    /** Compat con páginas que invocan {@code window.Android.openSelector(urlOrPlaybackId)}. */
    @JavascriptInterface
    public void openSelector(String streamIdOrUrl) {
      runOnUiThread(() -> openSelectorInternal(streamIdOrUrl, "split"));
    }

    /** Alias VR histórico: abre Selector en escena split. */
    @JavascriptInterface
    public void onVrClick() {
      runOnUiThread(() -> openSelectorInternal("", "split"));
    }

    /** Alias VR con URL opcional. */
    @JavascriptInterface
    public void onVrClick(String streamUrl) {
      runOnUiThread(() -> openSelectorInternal(streamUrl, "split"));
    }

    /** Reabre/actualiza Coliseo directo para evitar errores de bridge faltante. */
    @JavascriptInterface
    public void openColiceoDirect() {
      runOnUiThread(ColiceoActivity.this::attachAndShowColiseoBrowserWebView);
    }

    /** Reabre/actualiza Coliseo directo con URL opcional. */
    @JavascriptInterface
    public void openColiceoDirect(String url) {
      runOnUiThread(
          () -> {
            String target = url != null ? url.trim() : "";
            if (!target.isEmpty()) {
              initialColiseoUrl = target;
            }
            attachAndShowColiseoBrowserWebView();
          });
    }
  }
}
