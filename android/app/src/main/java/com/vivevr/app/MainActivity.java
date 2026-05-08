package com.vivevr.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.view.Gravity;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

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
import java.util.Map;

/**
 * Gestiona captura de audio/vídeo en WebView (p. ej. Agora/WebRTC): el manifest no basta —
 * hay que resolver {@link PermissionRequest} y lanzar los permisos en tiempo de ejecución.
 */
public class MainActivity extends BridgeActivity {

  /** Vídeo “Casa” (Cloudinary); abierto con el reproductor del sistema — sin cambiar la web empaquetada. */
  private static final String CASA_VIDEO_URL =
      "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757336/Selena_-_Bidi_Bidi_Bom_Bom_hcvcfk.mp4";

  private ActivityResultLauncher<String[]> webkitMediaPermissionLauncher;
  /** Petición pendiente devuelta por el WebChromeClient del WebView */
  private PermissionRequest pendingWebkitPermissionRequest;
  /** Permisos de Android lanzados junto con {@link #pendingWebkitPermissionRequest} */
  private String[] pendingAndroidPermissionNames;

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
    webView.setWebChromeClient(
        new BridgeWebChromeClient(bridge) {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            runOnUiThread(() -> handleWebKitMediaPermission(request));
          }
        });

    WebSettings settings = webView.getSettings();
    settings.setMediaPlaybackRequiresUserGesture(false);

    attachCasaVideoButton();
  }

  /**
   * Botón nativo “Casa” encima del WebView: abre el MP4 fuera de la lógica React.
   * La interfaz de escenas (inmersiva / dividida / mixta) sigue viniendo solo del HTML.
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
