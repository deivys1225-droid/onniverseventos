package com.vivevr.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.appcompat.app.AlertDialog;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.google.android.material.button.MaterialButton;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Gestiona captura de audio/vídeo en WebView (p. ej. Agora/WebRTC): el manifest no basta —
 * hay que resolver {@link PermissionRequest} y lanzar los permisos en tiempo de ejecución.
 */
public class MainActivity extends BridgeActivity {

  /** URL de entrada oficial al abrir la app. */
  private static final String INITIAL_WEB_URL = "https://onnivers.com";

  /** Destinos del reproductor de audiencia (botones 360 / VR / MT desde JS {@code AndroidBridge}). */
  private static final String AUDIENCE_GO_360_URL = "https://onnivers.com/go/360";
  private static final String AUDIENCE_GO_VR_URL = "https://onnivers.com/go/vr";
  private static final String AUDIENCE_GO_MT_URL = "https://onnivers.com/go/mt";

  private static final String DEFAULT_AUDIENCE_CHANNEL = "main";

  /** Vídeo “Casa” (Cloudinary); abierto con el reproductor del sistema — sin cambiar la web empaquetada. */
  private static final String CASA_VIDEO_URL =
      "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757336/Selena_-_Bidi_Bidi_Bom_Bom_hcvcfk.mp4";

  private ActivityResultLauncher<String[]> webkitMediaPermissionLauncher;
  /** Petición pendiente devuelta por el WebChromeClient del WebView */
  private PermissionRequest pendingWebkitPermissionRequest;
  /** Permisos de Android lanzados junto con {@link #pendingWebkitPermissionRequest} */
  private String[] pendingAndroidPermissionNames;
  private String pendingSceneAfterNavigation;

  private interface SceneSelectionCallback {
    void onSelected(String sceneKey);
  }

  /** Usado por la interceptación de URLs en el WebViewClient (navegación + selector + loadUrl). */
  private void setPendingSceneAfterNavigation(String scene) {
    pendingSceneAfterNavigation = scene;
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    webkitMediaPermissionLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), this::finishWebKitPermissionPrompt);

    SplashScreen.installSplashScreen(this);
    super.onCreate(savedInstanceState);
  }

  /**
   * Tras crear el Bridge, sustituye el WebChromeClient por uno que concede vídeo/audio
   * tras el resultado del sistema (o al instante si ya estaban concedidos).
   */
  @Override
  protected void load() {
    super.load();
    Bridge bridge = getBridge();
    if (bridge == null) {
      return;
    }
    WebView webView = bridge.getWebView();
    webView.setWebViewClient(
        new WebViewClient() {
          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri target = request != null ? request.getUrl() : null;
            if (target == null || !isPlaybackTarget(target)) {
              return false;
            }
            String playbackUrl = resolvePlaybackUrl(target);
            showSceneSelector(
                view,
                "split",
                scene -> {
                  setPendingSceneAfterNavigation(scene);
                  view.loadUrl(playbackUrl);
                });
            return true;
          }

          @Override
          public void onPageFinished(WebView view, String url) {
            super.onPageFinished(view, url);
            if (pendingSceneAfterNavigation == null || pendingSceneAfterNavigation.isEmpty()) {
              return;
            }
            String scene = pendingSceneAfterNavigation;
            pendingSceneAfterNavigation = null;
            dispatchSceneToJs(view, scene);
          }
        });
    webView.setWebChromeClient(
        new BridgeWebChromeClient(bridge) {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(() -> handleWebKitMediaPermission(request));
          }
        });

    WebSettings settings = webView.getSettings();
    settings.setMediaPlaybackRequiresUserGesture(false);
    webView.loadUrl(INITIAL_WEB_URL);

    webView.addJavascriptInterface(new AudienceSceneBridge(this, bridge), "AndroidScene");
    webView.addJavascriptInterface(new AndroidBridge(this, bridge), "AndroidBridge");

    attachCasaVideoButton();
  }

  /**
   * Puente Web → nativo: la sala de audiencia llama {@code AndroidScene.openSceneSelector(preferred)}
   * para mostrar el selector de escenas en UI Android (AlertDialog) y devolver la elección al JS.
   */
  private static final class AudienceSceneBridge {

    private final MainActivity activity;
    private final Bridge bridge;

    AudienceSceneBridge(MainActivity activity, Bridge bridge) {
      this.activity = activity;
      this.bridge = bridge;
    }

    @JavascriptInterface
    public void openSceneSelector(String preferredScene) {
      activity.runOnUiThread(
          () -> {
            WebView webView = bridge.getWebView();
            if (webView == null) {
              return;
            }
            final String[] keys = new String[] {"split", "immersive", "mix"};
            final String[] labels =
                new String[] {
                  "Pantalla dividida",
                  "Escena inmersiva (360°)",
                  "Escena mixta",
                };
            activity.showSceneSelector(
                webView,
                preferredScene,
                selectedScene -> {
                  for (int i = 0; i < keys.length; i++) {
                    if (keys[i].equals(selectedScene)) {
                      dispatchSceneToJs(keys[i]);
                      return;
                    }
                  }
                  dispatchSceneToJs("split");
                });
          });
    }

    private void dispatchSceneToJs(String scene) {
      WebView webView = bridge.getWebView();
      if (webView == null) {
        return;
      }
      String esc = scene.replace("\\", "\\\\").replace("'", "\\'");
      webView.evaluateJavascript(
          "(function(){ if(window.__onniversoNativeDispatch) window.__onniversoNativeDispatch('"
              + esc
              + "'); })()",
          null);
    }
  }

  /**
   * Puente Web → nativo para los botones 360°, VR y MT del reproductor:
   * {@code AndroidBridge.on360Click()}, {@code AndroidBridge.onVrClick()}, {@code AndroidBridge.onMtClick()}.
   * {@code AndroidBridge.abrirMiSelectorNativo()} solo muestra el mismo {@link AlertDialog} de escena que {@link AudienceSceneBridge#openSceneSelector(String)} (sin cargar URL).
   */
  private static final class AndroidBridge {

    private final MainActivity activity;
    private final Bridge bridge;

    AndroidBridge(MainActivity activity, Bridge bridge) {
      this.activity = activity;
      this.bridge = bridge;
    }

    /** Solo UI nativa: AlertDialog “Selector de escena”; al elegir se despacha a JS como {@link AudienceSceneBridge}. Sin {@code loadUrl}. */
    @JavascriptInterface
    public void abrirMiSelectorNativo() {
      activity.runOnUiThread(
          () -> {
            WebView webView = bridge.getWebView();
            if (webView == null) {
              return;
            }
            activity.showSceneSelector(
                webView,
                "split",
                scene -> activity.dispatchSceneToJs(webView, scene));
          });
    }

    private void loadAudienceGoUrl(String url) {
      activity.runOnUiThread(
          () -> {
            WebView webView = bridge.getWebView();
            if (webView != null) {
              webView.loadUrl(url);
            }
          });
    }

    /**
     * Si JS envía la URL del MP4 de la sala actual, el WebViewClient la intercepta y abre el mismo
     * flujo de escena nativo con ese vídeo. Si viene vacío, se mantiene el destino /go/* (páginas remotas).
     */
    private static String resolveAudienceLaunchUrl(String mp4FromJs, String fallbackGoUrl) {
      if (mp4FromJs == null) {
        return fallbackGoUrl;
      }
      String t = mp4FromJs.trim();
      if (t.isEmpty()) {
        return fallbackGoUrl;
      }
      return t;
    }

    @JavascriptInterface
    public void on360Click(String mp4Url) {
      loadAudienceGoUrl(resolveAudienceLaunchUrl(mp4Url, AUDIENCE_GO_360_URL));
    }

    @JavascriptInterface
    public void onVrClick(String mp4Url) {
      loadAudienceGoUrl(resolveAudienceLaunchUrl(mp4Url, AUDIENCE_GO_VR_URL));
    }

    @JavascriptInterface
    public void onMtClick(String mp4Url) {
      loadAudienceGoUrl(resolveAudienceLaunchUrl(mp4Url, AUDIENCE_GO_MT_URL));
    }
  }

  private void showSceneSelector(WebView webView, String preferredScene, SceneSelectionCallback callback) {
    final String[] keys = new String[] {"split", "immersive", "mix"};
    final String[] labels =
        new String[] {
          "Pantalla dividida",
          "Escena inmersiva (360°)",
          "Escena mixta",
        };
    int checkedItem = 0;
    if ("immersive".equals(preferredScene)) {
      checkedItem = 1;
    } else if ("mix".equals(preferredScene)) {
      checkedItem = 2;
    }

    new AlertDialog.Builder(this)
        .setTitle("Selector de escena")
        .setSingleChoiceItems(
            labels,
            checkedItem,
            (dialog, which) -> {
              callback.onSelected(keys[which]);
              dialog.dismiss();
            })
        .setNegativeButton(android.R.string.cancel, null)
        .show();
  }

  private void dispatchSceneToJs(WebView webView, String scene) {
    String esc = scene.replace("\\", "\\\\").replace("'", "\\'");
    webView.evaluateJavascript(
        "(function(){ if(window.__onniversoNativeDispatch) window.__onniversoNativeDispatch('"
            + esc
            + "'); })()",
        null);
  }

  private boolean isPlaybackTarget(Uri uri) {
    String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
    String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";
    String path = uri.getPath() != null ? uri.getPath().toLowerCase(Locale.ROOT) : "";
    if ("onniverso".equals(scheme) && "open".equals(host)) return true;
    if (!"https".equals(scheme)) return false;
    if ("aluniverso.com".equals(host)
        || "www.aluniverso.com".equals(host)
        || "onnivers.com".equals(host)
        || "www.onnivers.com".equals(host)) {
      return path.startsWith("/sala/espectador/");
    }
    return path.endsWith(".mp4");
  }

  private String resolvePlaybackUrl(Uri uri) {
    String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
    if ("onniverso".equals(scheme) && "open".equals(uri.getHost())) {
      String inner = uri.getQueryParameter("url");
      if (inner != null && !inner.trim().isEmpty()) {
        return inner.trim();
      }
    }
    String path = uri.getPath() != null ? uri.getPath().toLowerCase(Locale.ROOT) : "";
    if (path.endsWith(".mp4")) {
      return INITIAL_WEB_URL
          + "/sala/espectador/"
          + DEFAULT_AUDIENCE_CHANNEL
          + "?mode=vod&mp4="
          + Uri.encode(uri.toString());
    }
    return uri.toString();
  }

  /**
   * Botón nativo “Casa” encima del WebView: abre el MP4 fuera de la lógica web empaquetada.
   */
  private void attachCasaVideoButton() {
    ViewGroup content = findViewById(android.R.id.content);
    if (content == null) {
      return;
    }
    if (content.findViewWithTag("casa_video_btn") != null) {
      return;
    }
    float density = getResources().getDisplayMetrics().density;
    MaterialButton btn = new MaterialButton(this);
    btn.setTag("casa_video_btn");
    btn.setText("Casa");
    btn.setElevation(28f);
    int pad = (int) (14 * density);
    btn.setPadding(pad, pad, pad, pad);
    FrameLayout.LayoutParams lp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    lp.gravity = Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL;
    lp.bottomMargin = (int) (80 * density);
    btn.setLayoutParams(lp);
    btn.setOnClickListener(
        v -> {
          Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(CASA_VIDEO_URL));
          intent.addCategory(Intent.CATEGORY_BROWSABLE);
          try {
            startActivity(Intent.createChooser(intent, getString(R.string.app_name)));
          } catch (Exception ignored) {
            // Sin app compatible para video/HTTP
          }
        });
    content.addView(btn);
  }

  private void handleWebKitMediaPermission(PermissionRequest request) {
    List<String> androidPerms = new ArrayList<>();
    List<String> resources = Arrays.asList(request.getResources());

    if (resources.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
      androidPerms.add(Manifest.permission.CAMERA);
    }
    if (resources.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
      androidPerms.add(Manifest.permission.RECORD_AUDIO);
    }

    if (androidPerms.isEmpty()) {
      request.grant(request.getResources());
      return;
    }

    LinkedHashSet<String> uniq = new LinkedHashSet<>(androidPerms);
    String[] toRequest = uniq.toArray(new String[0]);

    boolean alreadyGranted = true;
    for (String perm : toRequest) {
      if (ContextCompat.checkSelfPermission(this, perm) != PackageManager.PERMISSION_GRANTED) {
        alreadyGranted = false;
        break;
      }
    }
    if (alreadyGranted) {
      request.grant(request.getResources());
      return;
    }

    pendingWebkitPermissionRequest = request;
    pendingAndroidPermissionNames = toRequest;
    webkitMediaPermissionLauncher.launch(toRequest);
  }

  private void finishWebKitPermissionPrompt(Map<String, Boolean> result) {
    PermissionRequest kitRequest = pendingWebkitPermissionRequest;
    String[] asked = pendingAndroidPermissionNames;
    pendingWebkitPermissionRequest = null;
    pendingAndroidPermissionNames = null;

    if (kitRequest == null || asked == null) {
      return;
    }

    boolean allOk = true;
    for (String perm : asked) {
      Boolean g = result.get(perm);
      if (g == null || !g) {
        allOk = false;
        break;
      }
    }

    if (allOk) {
      kitRequest.grant(kitRequest.getResources());
    } else {
      kitRequest.deny();
    }
  }
}
