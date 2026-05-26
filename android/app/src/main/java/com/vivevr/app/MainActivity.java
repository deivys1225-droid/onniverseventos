package com.vivevr.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Base64;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.PermissionRequest;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.core.content.ContextCompat;
import androidx.core.splashscreen.SplashScreen;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.google.android.material.button.MaterialButton;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Gestiona captura de audio/vídeo en WebView (p. ej. Agora/WebRTC): el manifest no basta —
 * hay que resolver {@link PermissionRequest} y lanzar los permisos en tiempo de ejecución.
 */
public class MainActivity extends BridgeActivity {

  /**
   * Base remota usada SOLO por el flujo de streaming/audiencia (resolvePlaybackUrl,
   * AUDIENCE_GO_*). El arranque y la navegación interna NO la usan: el WebView de
   * Capacitor sirve la app desde {@code https://localhost/} (assets/public/) para que
   * la app abra sin internet.
   */
  private static final String INITIAL_WEB_URL = "https://onnivers.com";
  /**
   * Lobby inmersivo local — apunta a la copia empaquetada en assets/public/. Capacitor
   * con androidScheme="https" sirve la app desde localhost; el path lo maneja React
   * Router al cargar index.html.
   */
  private static final String LOBBY_IMMERSIVE_URL = "https://localhost/lobby-inmersivo";

  /**
   * Lobby Pantalla 2 — WebView nativo solo si el embed es TikTok (ver NeonRoom). Con Google Maps
   * se usa el iframe 3D; esta URL solo aplica cuando JS activa el overlay nativo para TikTok.
   */
  private static final String LOBBY_PANTALLA2_TIKTOK_URL = "https://www.tiktok.com/foryou";

  private static final String LOBBY_PANTALLA2_UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

  private static final String DEFAULT_AUDIENCE_CHANNEL = "main";

  /** Vídeo “Casa” (Cloudinary); abierto con el reproductor del sistema — sin cambiar la web empaquetada. */
  private static final String CASA_VIDEO_URL =
      "https://res.cloudinary.com/dfsabdxup/video/upload/v1777757336/Selena_-_Bidi_Bidi_Bom_Bom_hcvcfk.mp4";

  /**
   * Actividades nativas de sala en vivo (Cine Live / Live Cam). Payload Agora desde JS:
   * {@code appId|channel|token} o {@code channel|token}. Extras: agoraPayload, agoraAppId,
   * agoraChannel, agoraToken (y streamUrl legacy con el mismo texto).
   */
  private static final String NATIVE_ACTIVITY_CINE_LIVE = "com.vivevr.app.CineLiveActivity";
  private static final String NATIVE_ACTIVITY_CAM_LIVE = "com.vivevr.app.CamLiveActivity";
  /** Lobby VR — doble ventana (master/slave); sin URL desde JS. */
  private static final String NATIVE_ACTIVITY_LOBBY_VR = "com.vivevr.app.LobbyVrActivity";
  /** Reproductor galería — actividad nativa; sin URL desde JS. */
  private static final String NATIVE_ACTIVITY_GALLERY = "com.vivevr.app.GalleryActivity";
  /** Aula Virtual estéreo — un WebView duplicado por {@link StereoContainer}. */
  private static final String NATIVE_ACTIVITY_AULA_VIRTUAL = "com.vivevr.app.AulaVirtualActivity";
  private static final String EXTRA_AGORA_PAYLOAD = "agoraPayload";
  private static final String EXTRA_AGORA_APP_ID = "agoraAppId";
  private static final String EXTRA_AGORA_CHANNEL = "agoraChannel";
  private static final String EXTRA_AGORA_TOKEN = "agoraToken";
  /** Legacy: mismo valor que {@link #EXTRA_AGORA_PAYLOAD}. */
  private static final String EXTRA_NATIVE_STREAM_URL = "streamUrl";

  private ActivityResultLauncher<String[]> webkitMediaPermissionLauncher;
  /** Onni — permiso RECORD_AUDIO antes de SpeechRecognition en el WebView. */
  private ActivityResultLauncher<String[]> onniMicPermissionLauncher;
  private String pendingOnniMicCallback;
  /** Legacy: sin uso para reproducción (flujo nativo vía {@link #openStreamSelector}). */
  private ActivityResultLauncher<Intent> selectorActivityLauncher;
  /** Maleta HLS/playback activo para botones 360 / Mixta / Inmersiva ({@link AndroidBridge}). */
  private String activeAudiencePlaybackUrl;
  /** playback_id Mux en maleta (alternativa a URL HLS completa). */
  private String activeAudiencePlaybackId;
  /** Petición pendiente devuelta por el WebChromeClient del WebView */
  private PermissionRequest pendingWebkitPermissionRequest;
  /** Permisos de Android lanzados junto con {@link #pendingWebkitPermissionRequest} */
  private String[] pendingAndroidPermissionNames;
  /** WebView exclusivo Pantalla 2 (TikTok); no afecta al WebView principal de Capacitor. */
  private WebView lobbyPantalla2WebView;

  private boolean lobbyPantalla2WebViewUrlLoaded;

  // ----- Lobby Pantalla 1 — reproductor MP3/MP4 desde carpeta del dispositivo (SAF) -----
  /** Límite defensivo para no inflar memoria al recorrer carpetas enormes. */
  private static final int MAX_MUSIC_FILES = 2000;
  /** Lanzador del selector de carpeta nativo ({@link Intent#ACTION_OPEN_DOCUMENT_TREE}). */
  private ActivityResultLauncher<Intent> musicFolderPickerLauncher;
  /**
   * Pre-prompt opcional de permisos de medios (Android 13+: READ_MEDIA_AUDIO/VIDEO; pre-13:
   * READ_EXTERNAL_STORAGE). SAF no los exige, pero respondemos al pedido del usuario
   * "que pida permiso" mostrando el diálogo antes del picker.
   */
  private ActivityResultLauncher<String[]> musicPermissionLauncher;
  /** Nombre del callback JS ({@code window[name]}) al que devolver los items o el error. */
  private String pendingMusicFolderCallback;
  /** URIs SAF de los archivos del último picker (lectura lazy en {@code AndroidMusic.readMusicFileBase64}). */
  private final List<Uri> pickedMusicUris = Collections.synchronizedList(new ArrayList<>());
  /** Mime detectado por DocumentFile o por extensión (paralelo a {@link #pickedMusicUris}). */
  private final List<String> pickedMusicMime = Collections.synchronizedList(new ArrayList<>());

  /**
   * Card / bridge → {@link SelectorActivity} → {@link PlayerActivity} (ExoPlayer). Sin WebView.
   */
  private void openStreamSelector(String playbackUrl, String playbackId, String preferredScene) {
    String url = playbackUrl != null ? playbackUrl.trim() : "";
    String id = playbackId != null ? playbackId.trim() : "";
    String resolved = StreamUrlResolver.resolve(url, id);
    if (resolved.isEmpty()) {
      Toast.makeText(this, "Falta stream_url o playback_id.", Toast.LENGTH_SHORT).show();
      return;
    }
    activeAudiencePlaybackUrl = resolved;
    if (!id.isEmpty()) {
      activeAudiencePlaybackId = id;
    } else {
      String extracted = StreamUrlResolver.extractMuxPlaybackIdFromHls(resolved);
      if (!extracted.isEmpty()) {
        activeAudiencePlaybackId = extracted;
      }
    }
    Intent intent = new Intent(this, SelectorActivity.class);
    intent.putExtra(SelectorActivity.EXTRA_PREFERRED_SCENE, normalizeSceneKey(preferredScene));
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    intent.putExtra(StreamExtras.STREAM_URL, resolved);
    intent.putExtra(SelectorActivity.EXTRA_PLAYBACK_URL, resolved);
    if (activeAudiencePlaybackId != null && !activeAudiencePlaybackId.isEmpty()) {
      intent.putExtra(SelectorActivity.EXTRA_PLAYBACK_ID, activeAudiencePlaybackId);
    }
    startActivity(intent);
  }

  /**
   * Tarjeta EN VIVO ({@code openStreamDirect}): URL .m3u8 → {@link PlayerActivity} sin pasar por
   * la UI de {@link SelectorActivity}.
   */
  /**
   * Puente Galería 3D / Aula ({@link AndroidBridge#openModelDirect}) →
   * {@link AulaVirtualActivity} (estéreo, un solo WebView). Los parámetros legacy se ignoran.
   */
  private void deliverModelDirectToNative(String modelUrl, String action) {
    launchAulaVirtualDirect();
  }

  private void launchAulaVirtualDirect() {
    try {
      Intent intent = new Intent();
      intent.setClassName(getPackageName(), NATIVE_ACTIVITY_AULA_VIRTUAL);
      intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(
              this,
              "Aula Virtual nativa no disponible en esta compilación.",
              Toast.LENGTH_LONG)
          .show();
    }
  }

  private void openStreamPlayerDirect(String playbackUrl, String playbackId, String preferredScene) {
    String url = playbackUrl != null ? playbackUrl.trim() : "";
    String id = playbackId != null ? playbackId.trim() : "";
    String resolved = StreamUrlResolver.resolve(url, id);
    if (resolved.isEmpty()) {
      Toast.makeText(this, "Falta stream_url o playback_id.", Toast.LENGTH_SHORT).show();
      return;
    }
    activeAudiencePlaybackUrl = resolved;
    if (!id.isEmpty()) {
      activeAudiencePlaybackId = id;
    } else {
      String extracted = StreamUrlResolver.extractMuxPlaybackIdFromHls(resolved);
      if (!extracted.isEmpty()) {
        activeAudiencePlaybackId = extracted;
      }
    }
    Intent intent = new Intent(this, PlayerActivity.class);
    intent.putExtra(PlayerActivity.EXTRA_SELECTED_SCENE, normalizeSceneKey(preferredScene));
    intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
    intent.putExtra(StreamExtras.STREAM_URL, resolved);
    intent.putExtra(PlayerActivity.EXTRA_PLAYBACK_URL, resolved);
    if (activeAudiencePlaybackId != null && !activeAudiencePlaybackId.isEmpty()) {
      intent.putExtra(PlayerActivity.EXTRA_PLAYBACK_ID, activeAudiencePlaybackId);
    }
    startActivity(intent);
  }

  private void openAudienceSelector(String preferredScene, String playbackUrl, String playbackId) {
    runOnUiThread(
        () -> {
          String url = resolveNativePlaybackUrl(playbackUrl);
          String id = playbackId != null ? playbackId.trim() : "";
          if (url.isEmpty() && !id.isEmpty()) {
            openStreamSelector("", id, preferredScene);
            return;
          }
          if (url.isEmpty()) {
            Toast.makeText(this, "No hay URL de stream en la maleta nativa.", Toast.LENGTH_SHORT).show();
            return;
          }
          openStreamSelector(url, id, preferredScene);
        });
  }

  /** Maleta HLS/MP4 activa o URL HTTP directa — nunca rutas /go/* web. */
  private String resolveNativePlaybackUrl(String candidateUrl) {
    if (activeAudiencePlaybackUrl != null && !activeAudiencePlaybackUrl.isEmpty()) {
      return activeAudiencePlaybackUrl;
    }
    if (candidateUrl != null && StreamUrlResolver.isPlayableHttpUrl(candidateUrl.trim())) {
      return candidateUrl.trim();
    }
    return "";
  }

  /**
   * Entrada desde tarjeta en vivo: canal + token de audiencia hacia Activity nativa Agora.
   */
  private void deliverAgoraParamsToNative(String canal, String token) {
    String channel = canal != null ? canal.trim() : "";
    String audienceToken = token != null ? token.trim() : "";
    if (StreamUrlResolver.isPlayableHttpUrl(channel)) {
      String playbackId =
          !audienceToken.isEmpty() ? audienceToken : StreamUrlResolver.extractMuxPlaybackIdFromHls(channel);
      openStreamSelector(channel, playbackId, "split");
      return;
    }
    if (StreamUrlResolver.isPlayableHttpUrl(audienceToken)) {
      String playbackId =
          !channel.isEmpty() ? channel : StreamUrlResolver.extractMuxPlaybackIdFromHls(audienceToken);
      openStreamSelector(audienceToken, playbackId, "split");
      return;
    }
    if (channel.isEmpty()) {
      Toast.makeText(this, "Falta el canal o la URL de reproducción.", Toast.LENGTH_SHORT).show();
      return;
    }
    String payload = channel + "|" + audienceToken;
    launchNativeAgoraSessionActivity(NATIVE_ACTIVITY_CINE_LIVE, payload);
  }

  /**
   * Abre Activity nativa con sesión Agora (WebRTC) sin recargar el WebView.
   * {@code agoraPayload}: {@code appId|channel|token} o {@code channel|token}.
   */
  private void launchNativeAgoraSessionActivity(String activityClassName, String agoraPayload) {
    String payload = agoraPayload != null ? agoraPayload.trim() : "";
    if (payload.isEmpty()) {
      Toast.makeText(this, "Falta la sesión de Agora.", Toast.LENGTH_SHORT).show();
      return;
    }
    try {
      Intent intent = new Intent();
      intent.setClassName(this, activityClassName);
      intent.putExtra(EXTRA_AGORA_PAYLOAD, payload);
      intent.putExtra(EXTRA_NATIVE_STREAM_URL, payload);

      String[] parts = payload.split("\\|", -1);
      if (parts.length >= 3) {
        intent.putExtra(EXTRA_AGORA_APP_ID, parts[0].trim());
        intent.putExtra(EXTRA_AGORA_CHANNEL, parts[1].trim());
        intent.putExtra(EXTRA_AGORA_TOKEN, parts.length > 2 ? parts[2].trim() : "");
      } else if (parts.length >= 2) {
        intent.putExtra(EXTRA_AGORA_CHANNEL, parts[0].trim());
        intent.putExtra(EXTRA_AGORA_TOKEN, parts[1].trim());
      } else {
        intent.putExtra(EXTRA_AGORA_CHANNEL, payload);
      }

      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(
              this,
              "No se pudo abrir la vista nativa. Revisa el manifest y la clase "
                  + activityClassName,
              Toast.LENGTH_LONG)
          .show();
    }
  }

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    webkitMediaPermissionLauncher =
        registerForActivityResult(new ActivityResultContracts.RequestMultiplePermissions(), this::finishWebKitPermissionPrompt);

    onniMicPermissionLauncher =
        registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(), this::finishOnniMicPermission);

    selectorActivityLauncher =
        registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            result -> {
              // Reproducción 100% nativa: sin loadUrl, sin evaluateJavascript, sin notificar al WebView.
            });

    // Lobby Pantalla 1 — pre-prompt de permisos: SAF funciona aunque sean denegados;
    // disparamos el picker en ambos casos para no bloquear UX.
    musicPermissionLauncher =
        registerForActivityResult(
            new ActivityResultContracts.RequestMultiplePermissions(),
            grants -> launchMusicFolderPicker());

    musicFolderPickerLauncher =
        registerForActivityResult(
            new ActivityResultContracts.StartActivityForResult(),
            this::onMusicFolderPicked);

    SplashScreen.installSplashScreen(this);
    super.onCreate(savedInstanceState);
  }

  @Override
  public void onDestroy() {
    destroyLobbyPantalla2WebViewIfPresent();
    super.onDestroy();
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
            if (target == null) {
              return false;
            }
            if (isLobbyDeepLink(target)) {
              launchLobbyVrDirect();
              return true;
            }
            if (!isPlaybackTarget(target)) {
              return false;
            }
            String playbackUrl = resolvePlaybackUrl(target);
            if (StreamUrlResolver.isPlayableHttpUrl(playbackUrl)) {
              openStreamSelector(
                  playbackUrl, StreamUrlResolver.extractMuxPlaybackIdFromHls(playbackUrl), "split");
              return true;
            }
            return false;
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
    // OFFLINE-FIRST: NO forzar carga de la URL remota al boot. super.load() arriba ya cargó
    // el index.html local desde assets/public/ vía Capacitor. La línea anterior
    // (webView.loadUrl("https://onnivers.com")) hacía que la app dependiera de internet en
    // cada arranque y mostrara ERR_INTERNET_DISCONNECTED sin red.

    webView.addJavascriptInterface(new AudienceSceneBridge(this, bridge), "AndroidScene");
    webView.addJavascriptInterface(new AndroidBridge(this, bridge), "AndroidBridge");
    webView.addJavascriptInterface(new AndroidJsApi(this), "Android");
    // Lobby Pantalla 1: reproductor MP3/MP4 desde carpeta del dispositivo (SAF + base64).
    webView.addJavascriptInterface(new MusicFolderJsApi(this), "AndroidMusic");

    attachCasaVideoButton();
  }

  /**
   * Puente escena: abre selector nativo (sin {@code evaluateJavascript} ni /go/*).
   */
  private static final class AudienceSceneBridge {

    private final MainActivity activity;

    AudienceSceneBridge(MainActivity activity, Bridge bridge) {
      this.activity = activity;
    }

    @JavascriptInterface
    public void openSceneSelector(String preferredScene) {
      activity.runOnUiThread(
          () -> {
            String url = activity.resolveNativePlaybackUrl(null);
            if (url.isEmpty()) {
              Toast.makeText(
                      activity,
                      "Pulsa primero una tarjeta en vivo para cargar el stream.",
                      Toast.LENGTH_SHORT)
                  .show();
              return;
            }
            activity.openStreamSelector(
                url,
                activity.activeAudiencePlaybackId != null ? activity.activeAudiencePlaybackId : "",
                preferredScene);
          });
    }
  }

  /** Botones 360 / VR / MT → {@link SelectorActivity} → {@link PlayerActivity}. */
  private static final class AndroidBridge {

    private final MainActivity activity;

    AndroidBridge(MainActivity activity, Bridge bridge) {
      this.activity = activity;
    }

    @JavascriptInterface
    public void abrirMiSelectorNativo() {
      activity.runOnUiThread(
          () -> {
            String url = activity.resolveNativePlaybackUrl(null);
            if (!url.isEmpty()) {
              activity.openStreamSelector(url, activity.activeAudiencePlaybackId, "split");
            }
          });
    }

    @JavascriptInterface
    public void on360Click(String mp4Url) {
      activity.openAudienceSelector("immersive", mp4Url, null);
    }

    @JavascriptInterface
    public void onVrClick(String mp4Url) {
      activity.openAudienceSelector("split", mp4Url, null);
    }

    @JavascriptInterface
    public void onMtClick(String mp4Url) {
      activity.openAudienceSelector("mix", mp4Url, null);
    }

    /**
     * Tarjeta EN VIVO: URL .m3u8 directa + acción → {@link PlayerActivity} (sin SelectorActivity).
     * {@code OPEN_STREAM} → Cine (split). {@code OPEN_STREAM_CAM} → Realidad mixta (mix).
     */
    @JavascriptInterface
    public void openStreamDirect(String m3u8Url, String action) {
      activity.runOnUiThread(
          () -> {
            String url = m3u8Url != null ? m3u8Url.trim() : "";
            if (!StreamUrlResolver.isPlayableHttpUrl(url) || !url.toLowerCase(Locale.ROOT).contains(".m3u8")) {
              Toast.makeText(activity, "URL .m3u8 inválida.", Toast.LENGTH_SHORT).show();
              return;
            }
            String id = StreamUrlResolver.extractMuxPlaybackIdFromHls(url);
            String act = action != null ? action.trim().toUpperCase(Locale.ROOT) : "";
            String scene = "OPEN_STREAM_CAM".equals(act) ? "mix" : "split";
            activity.openStreamPlayerDirect(url, id, scene);
          });
    }

    /**
     * Tarjeta de sala: URL .m3u8 o .mp4 + acción → {@link PlayerActivity} sin SelectorActivity.
     * {@code OPEN_SALA_DIVIDIDA} → split. {@code OPEN_SALA_MIXTA} → mix. {@code OPEN_SALA_360} →
     * immersive.
     */
    @JavascriptInterface
    public void openSalaDirect(String salaUrl, String action) {
      activity.runOnUiThread(
          () -> {
            String url = salaUrl != null ? salaUrl.trim() : "";
            String lower = url.toLowerCase(Locale.ROOT);
            boolean isHls = lower.contains(".m3u8");
            boolean isMp4 = lower.contains(".mp4");
            if (!StreamUrlResolver.isPlayableHttpUrl(url) || (!isHls && !isMp4)) {
              Toast.makeText(activity, "URL de sala inválida (.m3u8 o .mp4).", Toast.LENGTH_SHORT).show();
              return;
            }
            String id = isHls ? StreamUrlResolver.extractMuxPlaybackIdFromHls(url) : "";
            String act = action != null ? action.trim().toUpperCase(Locale.ROOT) : "";
            String scene;
            if ("OPEN_SALA_MIXTA".equals(act)) {
              scene = "mix";
            } else if ("OPEN_SALA_360".equals(act)) {
              scene = "immersive";
            } else {
              scene = "split";
            }
            activity.openStreamPlayerDirect(url, id, scene);
          });
    }

    /**
     * Galería / modelos 3D → {@link AulaVirtualActivity} (estéreo). Parámetros legacy ignorados.
     */
    @JavascriptInterface
    public void openModelDirect(String modelUrl, String action) {
      activity.runOnUiThread(() -> activity.deliverModelDirectToNative(modelUrl, action));
    }

    /**
     * Tierra/Luna o acceso al lobby → {@link LobbyVrActivity} (doble ventana). La actividad
     * nativa ya conoce la URL y la configuración; no se pasa ningún parámetro desde JS.
     */
    @JavascriptInterface
    public void openLobbyDirect() {
      activity.runOnUiThread(() -> activity.launchLobbyVrDirect());
    }

    /**
     * Navbar REPRODUCTOR GALERIA → actividad nativa del reproductor. La app ya conoce la
     * configuración; no se pasa ningún parámetro desde JS.
     */
    @JavascriptInterface
    public void openGalleryDirect() {
      activity.runOnUiThread(() -> activity.launchGalleryDirect());
    }

    /**
     * Onni — pide {@link Manifest.permission#RECORD_AUDIO} y llama
     * {@code window[callbackName](grantedBoolean)}.
     */
    @JavascriptInterface
    public void requestOnniMicrophonePermission(String callbackName) {
      activity.runOnUiThread(() -> activity.launchOnniMicrophonePermissionFlow(callbackName));
    }
  }

  /**
   * Objeto global {@code window.Android} para AR ({@code onArClick}).
   */
  private static final class AndroidJsApi {

    private final MainActivity activity;

    AndroidJsApi(MainActivity activity) {
      this.activity = activity;
    }

    /** Coincide con {@code window.Android.onArClick()} desde JS (sin argumentos). */
    @JavascriptInterface
    public void onArClick() {
      activity.runOnUiThread(
          () -> {
            String url = activity.resolveNativePlaybackUrl(null);
            if (!url.isEmpty()) {
              activity.openStreamSelector(url, activity.activeAudiencePlaybackId, "immersive");
            }
          });
    }

    /** Coincide con {@code window.Android.onArClick("URL_DE_TU_SALA")}. */
    @JavascriptInterface
    public void onArClick(String salaUrl) {
      activity.openAudienceSelector("immersive", salaUrl, null);
    }

    /** Coincide con {@code window.Android.openLobby()} desde el botón Lobby del perfil. */
    @JavascriptInterface
    public void openLobby() {
      activity.runOnUiThread(() -> activity.launchLobbyVrDirect());
    }

    /** Coincide con {@code window.Android.openLobbyDirect()} (Tierra; sin URL). */
    @JavascriptInterface
    public void openLobbyDirect() {
      activity.runOnUiThread(() -> activity.launchLobbyVrDirect());
    }

    /**
     * Lobby Pantalla 2 — muestra el WebView nativo con TikTok (solo Android). El Web oculta el
     * iframe duplicado mientras está enfocado.
     */
    @JavascriptInterface
    public void showLobbyPantalla2WebView() {
      activity.runOnUiThread(() -> activity.attachAndShowLobbyPantalla2WebView());
    }

    @JavascriptInterface
    public void hideLobbyPantalla2WebView() {
      activity.runOnUiThread(() -> activity.hideLobbyPantalla2WebViewInternal());
    }

    /**
     * Reproduce stream en {@link SelectorActivity} (ExoPlayer). {@code window.Android.playStream(url)}.
     */
    @JavascriptInterface
    public void playStream(String streamUrl) {
      activity.runOnUiThread(
          () -> {
            String url = streamUrl != null ? streamUrl.trim() : "";
            if (url.isEmpty()) {
              Toast.makeText(activity, "Falta URL del stream.", Toast.LENGTH_SHORT).show();
              return;
            }
            String id = StreamUrlResolver.extractMuxPlaybackIdFromHls(url);
            activity.openStreamSelector(url, id, "split");
          });
    }

    /** @deprecated Usar {@link #playStream(String)} */
    @JavascriptInterface
    public void openLiveSelector(String playbackUrl, String playbackId) {
      activity.runOnUiThread(
          () -> {
            String url = playbackUrl != null ? playbackUrl.trim() : "";
            String id = playbackId != null ? playbackId.trim() : "";
            activity.openStreamSelector(url, id, "split");
          });
    }

    /**
     * Tarjeta de evento en vivo (WebView): {@code window.Android.getAgoraParams(canal, token)}.
     * {@code token} puede llevar playback_id cuando {@code canal} es URL HLS.
     */
    @JavascriptInterface
    public void getAgoraParams(String canal, String token) {
      activity.runOnUiThread(() -> activity.deliverAgoraParamsToNative(canal, token));
    }

    /** Cine Live — {@code window.Android.abrirCineLive(appId|channel|token)}. */
    @JavascriptInterface
    public void abrirCineLive(String agoraPayload) {
      activity.runOnUiThread(
          () ->
              activity.launchNativeAgoraSessionActivity(
                  NATIVE_ACTIVITY_CINE_LIVE, agoraPayload));
    }

    /** Live Cam — {@code window.Android.abrirCamLive(appId|channel|token)}. */
    @JavascriptInterface
    public void abrirCamLive(String agoraPayload) {
      activity.runOnUiThread(
          () ->
              activity.launchNativeAgoraSessionActivity(
                  NATIVE_ACTIVITY_CAM_LIVE, agoraPayload));
    }
  }

  private static String normalizeSceneKey(String preferred) {
    if (preferred == null || preferred.isEmpty()) {
      return "split";
    }
    if ("immersive".equals(preferred) || "mix".equals(preferred) || "split".equals(preferred)) {
      return preferred;
    }
    return "split";
  }

  private boolean isLobbyDeepLink(Uri uri) {
    String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
    String host = uri.getHost() != null ? uri.getHost().toLowerCase(Locale.ROOT) : "";
    return "onniver".equals(scheme) && "open-lobby".equals(host);
  }

  private void openLobbyImmersive(WebView webView) {
    WebView target = webView;
    if (target == null) {
      Bridge bridge = getBridge();
      if (bridge != null) {
        target = bridge.getWebView();
      }
    }
    if (target != null) {
      target.loadUrl(LOBBY_IMMERSIVE_URL);
    }
  }

  /** {@link AndroidBridge#openLobbyDirect} — abre LobbyVrActivity sin URL. */
  private void launchLobbyVrDirect() {
    try {
      Intent intent = new Intent();
      intent.setClassName(getPackageName(), NATIVE_ACTIVITY_LOBBY_VR);
      intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(
              this,
              "Lobby VR nativo no disponible en esta compilación.",
              Toast.LENGTH_LONG)
          .show();
    }
  }

  /** {@link AndroidBridge#openGalleryDirect} — abre GalleryActivity sin URL. */
  private void launchGalleryDirect() {
    try {
      Intent intent = new Intent();
      intent.setClassName(getPackageName(), NATIVE_ACTIVITY_GALLERY);
      intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(
              this,
              "Reproductor galería nativo no disponible en esta compilación.",
              Toast.LENGTH_LONG)
          .show();
    }
  }

  /**
   * Crea una sola vez el WebView de Pantalla 2 (TikTok) y lo añade encima del contenido.
   * Debe ejecutarse en el hilo UI.
   */
  private void ensureLobbyPantalla2WebViewCreated() {
    if (lobbyPantalla2WebView != null) {
      return;
    }
    ViewGroup content = findViewById(android.R.id.content);
    if (content == null) {
      return;
    }
    if (content.findViewWithTag("lobby_pantalla2_wv") != null) {
      return;
    }

    WebView wv = new WebView(this);
    wv.setTag("lobby_pantalla2_wv");
    float density = getResources().getDisplayMetrics().density;
    int topMargin = (int) (72f * density);

    FrameLayout.LayoutParams lp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    lp.topMargin = topMargin;
    wv.setLayoutParams(lp);
    wv.setVisibility(View.GONE);
    wv.setElevation(80f);
    wv.setBackgroundColor(0xff02030a);

    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setUserAgentString(LOBBY_PANTALLA2_UA);

    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            MainActivity.this.runOnUiThread(() -> handleWebKitMediaPermission(request));
          }
        });
    wv.setWebViewClient(new WebViewClient());
    wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);

    lobbyPantalla2WebView = wv;
    content.addView(wv);
  }

  private void attachAndShowLobbyPantalla2WebView() {
    ensureLobbyPantalla2WebViewCreated();
    if (lobbyPantalla2WebView == null) {
      return;
    }
    if (!lobbyPantalla2WebViewUrlLoaded) {
      lobbyPantalla2WebView.loadUrl(LOBBY_PANTALLA2_TIKTOK_URL);
      lobbyPantalla2WebViewUrlLoaded = true;
    }
    lobbyPantalla2WebView.setVisibility(View.VISIBLE);
    lobbyPantalla2WebView.bringToFront();
  }

  private void hideLobbyPantalla2WebViewInternal() {
    if (lobbyPantalla2WebView != null) {
      lobbyPantalla2WebView.setVisibility(View.GONE);
    }
  }

  private void destroyLobbyPantalla2WebViewIfPresent() {
    if (lobbyPantalla2WebView == null) {
      return;
    }
    ViewGroup parent = (ViewGroup) lobbyPantalla2WebView.getParent();
    if (parent != null) {
      parent.removeView(lobbyPantalla2WebView);
    }
    lobbyPantalla2WebView.destroy();
    lobbyPantalla2WebView = null;
    lobbyPantalla2WebViewUrlLoaded = false;
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

  // -----------------------------------------------------------------------------
  // Lobby Pantalla 1 — selector de carpeta de música y lectura por archivo.
  // Aislado del flujo de streaming: no toca AndroidBridge / AndroidScene / Selector.
  // -----------------------------------------------------------------------------

  /**
   * Punto de entrada desde JS ({@code window.AndroidMusic.pickMusicFolder("__cb")}).
   * Pide permisos de medios (Android 13+ granular, pre-13 storage clásico) y luego abre
   * {@link Intent#ACTION_OPEN_DOCUMENT_TREE}. El permiso real para leer la carpeta lo
   * concede SAF en el propio selector, no esta llamada — pero respondemos al
   * requerimiento del usuario ("que pida permiso") mostrando el diálogo del sistema.
   */
  private void launchMusicFolderPickerFlow(String callbackName) {
    pendingMusicFolderCallback = callbackName;
    String[] perms = collectMissingMediaPermissions();
    if (perms.length == 0) {
      launchMusicFolderPicker();
      return;
    }
    try {
      musicPermissionLauncher.launch(perms);
    } catch (Exception ignored) {
      launchMusicFolderPicker();
    }
  }

  private String[] collectMissingMediaPermissions() {
    List<String> list = new ArrayList<>();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      if (ContextCompat.checkSelfPermission(this, "android.permission.READ_MEDIA_AUDIO")
          != PackageManager.PERMISSION_GRANTED) {
        list.add("android.permission.READ_MEDIA_AUDIO");
      }
      if (ContextCompat.checkSelfPermission(this, "android.permission.READ_MEDIA_VIDEO")
          != PackageManager.PERMISSION_GRANTED) {
        list.add("android.permission.READ_MEDIA_VIDEO");
      }
    } else {
      if (ContextCompat.checkSelfPermission(this, Manifest.permission.READ_EXTERNAL_STORAGE)
          != PackageManager.PERMISSION_GRANTED) {
        list.add(Manifest.permission.READ_EXTERNAL_STORAGE);
      }
    }
    return list.toArray(new String[0]);
  }

  private void launchMusicFolderPicker() {
    if (pendingMusicFolderCallback == null) return;
    Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
    intent.addFlags(
        Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
    try {
      musicFolderPickerLauncher.launch(intent);
    } catch (Exception ignored) {
      String cb = pendingMusicFolderCallback;
      pendingMusicFolderCallback = null;
      if (cb != null) dispatchMusicResult(cb, "[]", "no-picker");
    }
  }

  private void onMusicFolderPicked(ActivityResult result) {
    String callback = pendingMusicFolderCallback;
    if (callback == null) return;
    if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
      pendingMusicFolderCallback = null;
      dispatchMusicResult(callback, "[]", "cancelled");
      return;
    }
    Uri tree = result.getData().getData();
    if (tree == null) {
      pendingMusicFolderCallback = null;
      dispatchMusicResult(callback, "[]", "no-tree");
      return;
    }
    try {
      int flags = result.getData().getFlags() & Intent.FLAG_GRANT_READ_URI_PERMISSION;
      getContentResolver().takePersistableUriPermission(tree, flags);
    } catch (SecurityException ignored) {
      // El picker concede acceso solo para esta sesión cuando no se persiste — basta para reproducir ahora.
    }
    pickedMusicUris.clear();
    pickedMusicMime.clear();
    new Thread(
            () -> {
              JSONArray arr = walkMediaTree(tree);
              String json = arr.toString();
              runOnUiThread(
                  () -> {
                    String cb = pendingMusicFolderCallback;
                    pendingMusicFolderCallback = null;
                    if (cb != null) dispatchMusicResult(cb, json, null);
                  });
            },
            "MusicFolderWalker")
        .start();
  }

  private JSONArray walkMediaTree(Uri tree) {
    JSONArray out = new JSONArray();
    DocumentFile root = DocumentFile.fromTreeUri(this, tree);
    if (root == null || !root.isDirectory()) return out;
    collectMediaInto(root, "", out);
    return out;
  }

  private void collectMediaInto(DocumentFile dir, String prefix, JSONArray out) {
    if (out.length() >= MAX_MUSIC_FILES) return;
    DocumentFile[] children;
    try {
      children = dir.listFiles();
    } catch (Exception e) {
      return;
    }
    if (children == null) return;
    for (DocumentFile child : children) {
      if (out.length() >= MAX_MUSIC_FILES) break;
      if (child == null) continue;
      String name = child.getName();
      if (name == null || name.isEmpty()) continue;
      String path = prefix.isEmpty() ? name : prefix + "/" + name;
      if (child.isDirectory()) {
        collectMediaInto(child, path, out);
      } else if (isMusicMediaName(name)) {
        int idx = pickedMusicUris.size();
        pickedMusicUris.add(child.getUri());
        String mime = child.getType();
        if (mime == null || mime.isEmpty() || "application/octet-stream".equals(mime)) {
          mime = mimeFromMusicName(name);
        }
        pickedMusicMime.add(mime);
        try {
          JSONObject o = new JSONObject();
          o.put("idx", idx);
          o.put("name", path);
          o.put("mime", mime);
          out.put(o);
        } catch (Exception ignored) {
          // JSONException prácticamente imposible aquí — el item se descarta y seguimos.
        }
      }
    }
  }

  private static boolean isMusicMediaName(String name) {
    String lower = name.toLowerCase(Locale.ROOT);
    return lower.endsWith(".mp3")
        || lower.endsWith(".m4a")
        || lower.endsWith(".ogg")
        || lower.endsWith(".wav")
        || lower.endsWith(".aac")
        || lower.endsWith(".flac")
        || lower.endsWith(".mp4");
  }

  private static String mimeFromMusicName(String name) {
    String lower = name.toLowerCase(Locale.ROOT);
    if (lower.endsWith(".mp3")) return "audio/mpeg";
    if (lower.endsWith(".m4a")) return "audio/mp4";
    if (lower.endsWith(".ogg")) return "audio/ogg";
    if (lower.endsWith(".wav")) return "audio/wav";
    if (lower.endsWith(".aac")) return "audio/aac";
    if (lower.endsWith(".flac")) return "audio/flac";
    if (lower.endsWith(".mp4")) return "video/mp4";
    return "application/octet-stream";
  }

  /**
   * Envía el resultado del picker al callback global JS con dos argumentos:
   * {@code (itemsArray, errorOrNull)}. Los items son inyectados como JSON literal en JS.
   */
  private void dispatchMusicResult(String callbackName, String jsonResult, String errorOrNull) {
    Bridge bridge = getBridge();
    WebView webView = bridge != null ? bridge.getWebView() : null;
    if (webView == null) return;
    String escErr =
        errorOrNull == null
            ? "null"
            : "'" + errorOrNull.replace("\\", "\\\\").replace("'", "\\'") + "'";
    String escCb = callbackName.replace("\\", "\\\\").replace("'", "\\'");
    String code =
        "(function(){ try { var cb = window['"
            + escCb
            + "']; if (typeof cb === 'function') cb("
            + jsonResult
            + ", "
            + escErr
            + "); } catch(e) { console.warn('music callback failed', e); } })();";
    webView.evaluateJavascript(code, null);
  }

  /**
   * Bridge JS expuesto como {@code window.AndroidMusic}. Solo lobby Pantalla 1 — los nombres
   * (Music* / AndroidMusic) están elegidos para no colisionar con {@code AndroidBridge},
   * {@code AndroidScene} ni {@code Android} (streaming/audiencia).
   */
  private static final class MusicFolderJsApi {

    private final MainActivity activity;

    MusicFolderJsApi(MainActivity activity) {
      this.activity = activity;
    }

    /**
     * Pide permisos y abre el selector nativo de carpeta. Al confirmar, JS recibe en
     * {@code window[callbackName](items, errorOrNull)} un array de {@code {idx, name, mime}}.
     */
    @JavascriptInterface
    public void pickMusicFolder(String callbackName) {
      if (callbackName == null || callbackName.isEmpty()) return;
      activity.runOnUiThread(() -> activity.launchMusicFolderPickerFlow(callbackName));
    }

    /**
     * Devuelve el archivo {@code idx} (índice obtenido en el último picker) como string base64
     * sin saltos de línea. JS lo convierte en {@code Blob}/{@code data:} para reproducir sin
     * depender del servidor local de Capacitor.
     */
    @JavascriptInterface
    public String readMusicFileBase64(int idx) {
      if (idx < 0 || idx >= activity.pickedMusicUris.size()) return "";
      Uri uri = activity.pickedMusicUris.get(idx);
      if (uri == null) return "";
      try (InputStream in = activity.getContentResolver().openInputStream(uri)) {
        if (in == null) return "";
        ByteArrayOutputStream buf = new ByteArrayOutputStream();
        byte[] chunk = new byte[64 * 1024];
        int n;
        while ((n = in.read(chunk)) > 0) buf.write(chunk, 0, n);
        return Base64.encodeToString(buf.toByteArray(), Base64.NO_WRAP);
      } catch (IOException e) {
        return "";
      } catch (SecurityException e) {
        // La sesión SAF puede haber expirado tras un reinicio sin persistencia — JS pide nueva carpeta.
        return "";
      }
    }

    /** MIME asociado al item; sirve para construir {@code data:audio/mpeg;base64,...}. */
    @JavascriptInterface
    public String getMusicMime(int idx) {
      if (idx < 0 || idx >= activity.pickedMusicMime.size()) return "";
      String mime = activity.pickedMusicMime.get(idx);
      return mime != null ? mime : "";
    }

    @JavascriptInterface
    public int getMusicCount() {
      return activity.pickedMusicUris.size();
    }
  }

  /**
   * Flujo Onni: si ya hay micrófono concedido, responde al JS de inmediato; si no, muestra el
   * diálogo del sistema (Android 6+).
   */
  private void launchOnniMicrophonePermissionFlow(String callbackName) {
    if (callbackName == null || callbackName.isEmpty()) {
      return;
    }
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        == PackageManager.PERMISSION_GRANTED) {
      dispatchOnniMicResult(callbackName, true);
      return;
    }
    pendingOnniMicCallback = callbackName;
    try {
      onniMicPermissionLauncher.launch(new String[] {Manifest.permission.RECORD_AUDIO});
    } catch (Exception ignored) {
      pendingOnniMicCallback = null;
      dispatchOnniMicResult(callbackName, false);
    }
  }

  private void finishOnniMicPermission(Map<String, Boolean> result) {
    String cb = pendingOnniMicCallback;
    pendingOnniMicCallback = null;
    if (cb == null || cb.isEmpty()) {
      return;
    }
    boolean granted =
        Boolean.TRUE.equals(result.get(Manifest.permission.RECORD_AUDIO))
            || ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    dispatchOnniMicResult(cb, granted);
  }

  private void dispatchOnniMicResult(String callbackName, boolean granted) {
    Bridge bridge = getBridge();
    WebView webView = bridge != null ? bridge.getWebView() : null;
    if (webView == null) {
      return;
    }
    String escCb = callbackName.replace("\\", "\\\\").replace("'", "\\'");
    String code =
        "(function(){ try { var cb = window['"
            + escCb
            + "']; if (typeof cb === 'function') cb("
            + (granted ? "true" : "false")
            + "); } catch(e) { console.warn('onni mic callback failed', e); } })();";
    webView.evaluateJavascript(code, null);
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
