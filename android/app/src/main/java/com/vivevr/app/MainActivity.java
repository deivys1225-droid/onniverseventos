package com.vivevr.app;

import android.Manifest;
import android.app.Activity;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.speech.tts.TextToSpeech;
import android.speech.tts.Voice;
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
import java.util.Set;

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

  /** Lobby Pantalla 2 — YouTube móvil en WebView nativo sobre el slot 3D. */
  private static final String LOBBY_SCREEN2_DEFAULT_URL = "https://m.youtube.com";

  /** Coliseo — YouTube escritorio en WebView nativo (UA de PC para evitar bloqueos móviles). */
  private static final String COLOSSEO_BROWSER_DEFAULT_URL = "https://www.youtube.com/";

  private static final String LOBBY_SCREEN_MOBILE_UA =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";

  /** Coliseo — Chrome Windows; YouTube sirve la versión de escritorio. */
  private static final String COLOSSEO_BROWSER_DESKTOP_UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

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
  private boolean pendingOnniStartListening;
  private SpeechRecognizer onniSpeechRecognizer;
  private Intent onniSpeechIntent;
  private TextToSpeech onniTts;
  private boolean onniTtsReady;
  private Locale onniTtsLocale = new Locale("es", "CO");
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
  /** WebView exclusivo Pantalla 2 (YouTube); no afecta al WebView principal de Capacitor. */
  private WebView lobbyPantalla2WebView;

  private boolean lobbyPantalla2WebViewUrlLoaded;

  /** Inicio — {@code window.Android.openVrRedes(url)}. */
  private WebView vrRedesWebView;

  /** Inicio — {@code window.Android.openRedesCamDirect(url)}. */
  private WebView redesCamWebView;

  /** Coliseo — {@code window.Android.showColiseoBrowserWebView()} sobre slot 3D. */
  private WebView coliseoBrowserWebView;

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
    destroyColiseoBrowserWebViewIfPresent();
    destroySocialRedesWebViews();
    releaseOnniVoiceEngine();
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

    /** Icono Coliseo / Cine / Cine Cam → {@link ColiceoActivity}. */
    @JavascriptInterface
    public void openColiceo() {
      activity.runOnUiThread(() -> activity.openColiceoActivity());
    }

    /** Oído exclusivo web: {@code window.AndroidBridge.openColiseoVR()}. */
    @JavascriptInterface
    public void openColiseoVR() {
      activity.runOnUiThread(() -> activity.openColiceoActivity());
    }

    /** Compat: {@code window.AndroidBridge.openColiseoDirect(url, action)}. */
    @JavascriptInterface
    public void openColiseoDirect(String url, String action) {
      activity.runOnUiThread(() -> activity.openColiceoActivity(url));
    }

    /**
     * Onni — pide {@link Manifest.permission#RECORD_AUDIO} y llama
     * {@code window[callbackName](grantedBoolean)}.
     */
    @JavascriptInterface
    public void requestOnniMicrophonePermission(String callbackName) {
      activity.runOnUiThread(() -> activity.launchOnniMicrophonePermissionFlow(callbackName));
    }

    @JavascriptInterface
    public void startListening() {
      activity.runOnUiThread(activity::startOnniListening);
    }

    @JavascriptInterface
    public void stopListening() {
      activity.runOnUiThread(activity::stopOnniListening);
    }

    @JavascriptInterface
    public void speak(String text) {
      activity.runOnUiThread(() -> activity.speakOnni(text));
    }

    @JavascriptInterface
    public void stopSpeaking() {
      activity.runOnUiThread(activity::stopOnniSpeaking);
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

    /** {@code window.Android.onVrClick()} — Cine / pantalla dividida ({@link SelectorActivity}). */
    @JavascriptInterface
    public void onVrClick() {
      onVrClick(null);
    }

    /** {@code window.Android.onVrClick(url)} */
    @JavascriptInterface
    public void onVrClick(String mp4Url) {
      activity.runOnUiThread(
          () -> {
            if ((mp4Url == null || mp4Url.trim().isEmpty())
                && activity.returnToHomeFromLobbyWebView()) {
              return;
            }
            activity.openAudienceSelector("split", mp4Url, null);
          });
    }

    /**
     * {@code window.Android.openSelector()} o {@code openSelector(streamId)} — misma maleta HLS
     * que las tarjetas en vivo.
     */
    @JavascriptInterface
    public void openSelector() {
      openSelector(null);
    }

    @JavascriptInterface
    public void openSelector(String streamId) {
      activity.runOnUiThread(
          () -> {
            String id = streamId != null ? streamId.trim() : "";
            if (id.isEmpty() && activity.returnToHomeFromLobbyWebView()) {
              return;
            }
            String url = activity.resolveNativePlaybackUrl(id.isEmpty() ? null : id);
            if (!url.isEmpty()) {
              activity.openStreamSelector(
                  url,
                  activity.activeAudiencePlaybackId != null ? activity.activeAudiencePlaybackId : "",
                  "split");
              return;
            }
            if (!id.isEmpty()) {
              activity.openStreamSelector("", id, "split");
              return;
            }
            Toast.makeText(
                    activity,
                    "Pulsa primero una tarjeta en vivo para cargar el stream.",
                    Toast.LENGTH_SHORT)
                .show();
          });
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
     * Lobby Pantalla 2 — WebView nativo (YouTube). Implementación original que ya funcionaba en el
     * APK; no usar el posicionamiento por slot que dejaba el overlay arriba o en 1×1 px.
     */
    @JavascriptInterface
    public void showLobbyPantalla2WebView() {
      activity.runOnUiThread(() -> activity.attachAndShowLobbyPantalla2WebView());
    }

    @JavascriptInterface
    public void hideLobbyPantalla2WebView() {
      activity.runOnUiThread(() -> activity.hideLobbyPantalla2WebViewInternal());
    }

    /** Actualiza posición/tamaño del WebView nativo al slot {@code lobby-screen-2} en la pared 3D. */
    @JavascriptInterface
    public void updateLobbyBounds() {
      activity.runOnUiThread(() -> activity.updateLobbyPantalla2Bounds());
    }

    /** Coliseo — WebView nativo YouTube sobre la pantalla flotante 3D. */
    @JavascriptInterface
    public void showColiseoBrowserWebView() {
      activity.runOnUiThread(() -> activity.attachAndShowColiseoBrowserWebView());
    }

    @JavascriptInterface
    public void hideColiseoBrowserWebView() {
      activity.runOnUiThread(() -> activity.hideColiseoBrowserWebViewInternal());
    }

    @JavascriptInterface
    public void updateColiseoBrowserBounds() {
      activity.runOnUiThread(() -> activity.updateColiseoBrowserBounds());
    }

    @JavascriptInterface
    public void loadColiseoBrowserUrl(String url) {
      activity.runOnUiThread(() -> activity.loadColiseoBrowserUrlInternal(url));
    }

    /** {@code window.Android.openColiceo()} — sala Coliseo nativa ({@link ColiceoActivity}). */
    @JavascriptInterface
    public void openColiceo() {
      activity.runOnUiThread(() -> activity.openColiceoActivity());
    }

    /** Oído exclusivo web: {@code window.Android.openColiseoVR()}. */
    @JavascriptInterface
    public void openColiseoVR() {
      activity.runOnUiThread(() -> activity.openColiceoActivity());
    }

    /** Compat: {@code window.Android.openColiseoDirect(url, action)}. */
    @JavascriptInterface
    public void openColiseoDirect(String url, String action) {
      activity.runOnUiThread(() -> activity.openColiceoActivity(url));
    }

    /** {@code window.Android.openVrRedes(url)} — iconos Redes en inicio. */
    @JavascriptInterface
    public void openVrRedes(String url) {
      activity.runOnUiThread(() -> activity.openSocialRedesOverlay(url, false));
    }

    /** {@code window.Android.openRedesCamDirect(url)} — iconos Redes Cam en inicio. */
    @JavascriptInterface
    public void openRedesCamDirect(String url) {
      activity.runOnUiThread(() -> activity.openSocialRedesOverlay(url, true));
    }

    @JavascriptInterface
    public void startListening() {
      activity.runOnUiThread(activity::startOnniListening);
    }

    @JavascriptInterface
    public void stopListening() {
      activity.runOnUiThread(activity::stopOnniListening);
    }

    @JavascriptInterface
    public void speak(String text) {
      activity.runOnUiThread(() -> activity.speakOnni(text));
    }

    @JavascriptInterface
    public void stopSpeaking() {
      activity.runOnUiThread(activity::stopOnniSpeaking);
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

  /** Botón «La Tierra» / volver al menú cuando el lobby carga en el WebView principal. */
  private boolean returnToHomeFromLobbyWebView() {
    Bridge bridge = getBridge();
    WebView webView = bridge != null ? bridge.getWebView() : null;
    if (webView == null) {
      return false;
    }
    String current = webView.getUrl();
    if (current == null || !current.contains("lobby-inmersivo")) {
      return false;
    }
    webView.loadUrl("https://localhost/");
    return true;
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

  /** {@link AndroidBridge#openColiceo} — sala Coliseo 360° nativa. */
  void openColiceoActivity() {
    try {
      Intent intent = new Intent(this, ColiceoActivity.class);
      intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(
              this,
              "Coliseo nativo no disponible en esta compilación.",
              Toast.LENGTH_LONG)
          .show();
    }
  }

  /** Bridge legado: abre Coliseo con URL directa ({@code putExtra("url", url)}). */
  void openColiceoActivity(String url) {
    try {
      Intent intent = new Intent(this, ColiceoActivity.class);
      intent.putExtra("url", url != null ? url : "");
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
      startActivity(intent);
    } catch (Exception e) {
      Toast.makeText(
              this,
              "Coliseo nativo no disponible en esta compilación.",
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

  private ViewGroup resolveLobbyOverlayParent() {
    Bridge bridge = getBridge();
    WebView main = bridge != null ? bridge.getWebView() : null;
    if (main != null && main.getParent() instanceof ViewGroup) {
      return (ViewGroup) main.getParent();
    }
    ViewGroup content = findViewById(android.R.id.content);
    return content;
  }

  private void ensureLobbyPantalla2WebViewCreated() {
    if (lobbyPantalla2WebView != null) {
      return;
    }
    ViewGroup parent = resolveLobbyOverlayParent();
    if (parent == null) {
      return;
    }
    View existing = parent.findViewWithTag("lobby_pantalla2_wv");
    if (existing instanceof WebView) {
      lobbyPantalla2WebView = (WebView) existing;
      return;
    }

    WebView wv = new WebView(this);
    wv.setTag("lobby_pantalla2_wv");
    FrameLayout.LayoutParams lp = new FrameLayout.LayoutParams(1, 1);
    lp.gravity = Gravity.TOP | Gravity.START;
    wv.setLayoutParams(lp);
    wv.setVisibility(View.GONE);
    wv.setElevation(10000f);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      wv.setZ(10000f);
    }
    wv.setBackgroundColor(0xff02030a);

    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setLoadWithOverviewMode(true);
    settings.setUseWideViewPort(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setUserAgentString(LOBBY_SCREEN_MOBILE_UA);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }

    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            if (!redesCam) {
              // Redes (sin cam): no conceder captura de cámara/micrófono.
              request.deny();
              return;
            }
            MainActivity.this.runOnUiThread(() -> handleWebKitMediaPermission(request));
          }
        });
    wv.setWebViewClient(new WebViewClient());
    wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);

    lobbyPantalla2WebView = wv;
    parent.addView(wv);
  }

  private void attachAndShowLobbyPantalla2WebView() {
    ensureLobbyPantalla2WebViewCreated();
    if (lobbyPantalla2WebView == null) {
      return;
    }
    if (!lobbyPantalla2WebViewUrlLoaded) {
      lobbyPantalla2WebView.loadUrl(LOBBY_SCREEN2_DEFAULT_URL);
      lobbyPantalla2WebViewUrlLoaded = true;
    }
    updateLobbyPantalla2Bounds();
    scheduleLobbyPantalla2BoundsRetries();
    lobbyPantalla2WebView.bringToFront();
    ViewGroup parent = resolveLobbyOverlayParent();
    if (parent != null) {
      parent.requestLayout();
    }
  }

  private void scheduleLobbyPantalla2BoundsRetries() {
    if (lobbyPantalla2WebView == null) {
      return;
    }
    final int[] delaysMs = {80, 200, 450, 900, 1800, 3000};
    for (int delay : delaysMs) {
      lobbyPantalla2WebView.postDelayed(this::updateLobbyPantalla2Bounds, delay);
    }
  }

  private void updateLobbyPantalla2Bounds() {
    if (lobbyPantalla2WebView == null) {
      return;
    }
    final String rectJs =
        "(window.__onniversoGetLobbyScreen2Rect&&window.__onniversoGetLobbyScreen2Rect())"
            + "||(window.__onniversoGetNativeWebViewSlotRect&&window.__onniversoGetNativeWebViewSlotRect('lobby-screen-2'))";
    applyJsRectToLobbyPantalla2WebView(rectJs);
  }

  private void applyJsRectToLobbyPantalla2WebView(String rectExpression) {
    Bridge bridge = getBridge();
    WebView main = bridge != null ? bridge.getWebView() : null;
    if (main == null || lobbyPantalla2WebView == null) {
      return;
    }
    String code =
        "(function(){try{var r="
            + rectExpression
            + ";if(!r)return null;return JSON.stringify(r);}catch(e){return null;}})();";
    main.evaluateJavascript(
        code,
        value ->
            runOnUiThread(
                () -> {
                  JSONObject rect = parseEvaluateJsonObject(value);
                  if (rect == null) {
                    return;
                  }
                  try {
                    float scale = main.getScale();
                    int w = (int) (rect.getInt("w") * scale + 0.5f);
                    int h = (int) (rect.getInt("h") * scale + 0.5f);
                    int x = (int) (rect.getInt("x") * scale + 0.5f);
                    int y = (int) (rect.getInt("y") * scale + 0.5f);
                    if (w < 48 || h < 48) {
                      return;
                    }
                    FrameLayout.LayoutParams lp =
                        new FrameLayout.LayoutParams(w, h);
                    lp.leftMargin = x;
                    lp.topMargin = y;
                    lp.gravity = Gravity.TOP | Gravity.START;
                    lobbyPantalla2WebView.setLayoutParams(lp);
                    lobbyPantalla2WebView.setVisibility(View.VISIBLE);
                    lobbyPantalla2WebView.bringToFront();
                  } catch (Exception ignored) {
                    // ignore malformed rect
                  }
                }));
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

  private void ensureColiseoBrowserWebViewCreated() {
    if (coliseoBrowserWebView != null) {
      return;
    }
    ViewGroup parent = resolveLobbyOverlayParent();
    if (parent == null) {
      return;
    }
    View existing = parent.findViewWithTag("coliseo_browser_wv");
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
    settings.setDatabaseEnabled(true);
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
            MainActivity.this.runOnUiThread(() -> handleWebKitMediaPermission(request));
          }
        });
    wv.setWebViewClient(new WebViewClient());
    wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);

    coliseoBrowserWebView = wv;
    parent.addView(wv);
  }

  private void attachAndShowColiseoBrowserWebView() {
    ensureColiseoBrowserWebViewCreated();
    if (coliseoBrowserWebView == null) {
      return;
    }
    loadColiseoBrowserUrlInternal(COLOSSEO_BROWSER_DEFAULT_URL);
    updateColiseoBrowserBounds();
    scheduleColiseoBrowserBoundsRetries();
    coliseoBrowserWebView.bringToFront();
    ViewGroup parent = resolveLobbyOverlayParent();
    if (parent != null) {
      parent.requestLayout();
    }
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
    if (coliseoBrowserWebView == null) {
      return;
    }
    final String rectJs =
        "(window.__onniversoGetColiseoBrowserRect&&window.__onniversoGetColiseoBrowserRect())";
    applyJsRectToColiseoBrowserWebView(rectJs);
  }

  private void applyJsRectToColiseoBrowserWebView(String rectExpression) {
    Bridge bridge = getBridge();
    WebView main = bridge != null ? bridge.getWebView() : null;
    if (main == null || coliseoBrowserWebView == null) {
      return;
    }
    String code =
        "(function(){try{var r="
            + rectExpression
            + ";if(!r)return null;return JSON.stringify(r);}catch(e){return null;}})();";
    main.evaluateJavascript(
        code,
        value ->
            runOnUiThread(
                () -> {
                  JSONObject rect = parseEvaluateJsonObject(value);
                  if (rect == null) {
                    return;
                  }
                  try {
                    float scale = main.getScale();
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
    ViewGroup parent = (ViewGroup) coliseoBrowserWebView.getParent();
    if (parent != null) {
      parent.removeView(coliseoBrowserWebView);
    }
    coliseoBrowserWebView.destroy();
    coliseoBrowserWebView = null;
  }

  private void openSocialRedesOverlay(String url, boolean redesCam) {
    String target = url != null ? url.trim() : "";
    if (target.isEmpty()) {
      Toast.makeText(this, "URL de red social vacía.", Toast.LENGTH_SHORT).show();
      return;
    }
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      Toast.makeText(this, "URL inválida (usa https://).", Toast.LENGTH_SHORT).show();
      return;
    }
    if (redesCam) {
      hideSocialRedesWebView(vrRedesWebView);
      showSocialRedesWebView(target, true);
    } else {
      hideSocialRedesWebView(redesCamWebView);
      showSocialRedesWebView(target, false);
    }
  }

  private void showSocialRedesWebView(String url, boolean redesCam) {
    WebView wv = ensureSocialRedesWebView(redesCam);
    if (wv == null) {
      return;
    }
    FrameLayout.LayoutParams lp =
        new FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    lp.gravity = Gravity.TOP | Gravity.START;
    wv.setLayoutParams(lp);
    wv.setVisibility(View.VISIBLE);
    wv.bringToFront();
    wv.loadUrl(url);
    ViewGroup parent = resolveLobbyOverlayParent();
    if (parent != null) {
      parent.requestLayout();
    }
  }

  private WebView ensureSocialRedesWebView(boolean redesCam) {
    WebView existing = redesCam ? redesCamWebView : vrRedesWebView;
    if (existing != null) {
      return existing;
    }
    ViewGroup parent = resolveLobbyOverlayParent();
    if (parent == null) {
      return null;
    }
    String tag = redesCam ? "redes_cam_wv" : "vr_redes_wv";
    View found = parent.findViewWithTag(tag);
    if (found instanceof WebView) {
      if (redesCam) {
        redesCamWebView = (WebView) found;
      } else {
        vrRedesWebView = (WebView) found;
      }
      return (WebView) found;
    }

    WebView wv = new WebView(this);
    wv.setTag(tag);
    wv.setVisibility(View.GONE);
    wv.setElevation(10001f);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      wv.setZ(10001f);
    }
    wv.setBackgroundColor(0xff02030a);

    WebSettings settings = wv.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setLoadWithOverviewMode(true);
    settings.setUseWideViewPort(true);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setUserAgentString(LOBBY_SCREEN_MOBILE_UA);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
    }

    wv.setWebChromeClient(
        new WebChromeClient() {
          @Override
          public void onPermissionRequest(final PermissionRequest request) {
            MainActivity.this.runOnUiThread(() -> handleWebKitMediaPermission(request));
          }
        });
    wv.setWebViewClient(
        new WebViewClient() {
          @Override
          public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request != null ? request.getUrl() : null;
            if (uri == null) {
              return false;
            }
            String scheme = uri.getScheme() != null ? uri.getScheme().toLowerCase(Locale.ROOT) : "";
            return !"http".equals(scheme) && !"https".equals(scheme);
          }
        });
    wv.setLayerType(View.LAYER_TYPE_HARDWARE, null);

    parent.addView(wv);
    if (redesCam) {
      redesCamWebView = wv;
    } else {
      vrRedesWebView = wv;
    }
    return wv;
  }

  private void hideSocialRedesWebView(WebView wv) {
    if (wv != null) {
      wv.setVisibility(View.GONE);
    }
  }

  private void destroySocialRedesWebViews() {
    destroySocialRedesWebView(vrRedesWebView, false);
    destroySocialRedesWebView(redesCamWebView, true);
    vrRedesWebView = null;
    redesCamWebView = null;
  }

  private void destroySocialRedesWebView(WebView wv, boolean redesCam) {
    if (wv == null) {
      return;
    }
    ViewGroup parent = (ViewGroup) wv.getParent();
    if (parent != null) {
      parent.removeView(wv);
    }
    wv.destroy();
  }

  @Override
  public void onBackPressed() {
    if (redesCamWebView != null && redesCamWebView.getVisibility() == View.VISIBLE) {
      hideSocialRedesWebView(redesCamWebView);
      return;
    }
    if (vrRedesWebView != null && vrRedesWebView.getVisibility() == View.VISIBLE) {
      hideSocialRedesWebView(vrRedesWebView);
      return;
    }
    super.onBackPressed();
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

  private void ensureOnniVoiceRecognizer() {
    if (onniSpeechRecognizer != null) {
      return;
    }
    if (!SpeechRecognizer.isRecognitionAvailable(this)) {
      dispatchOnniVoiceError("not_available", "SpeechRecognizer no disponible en este dispositivo.");
      return;
    }
    onniSpeechRecognizer = SpeechRecognizer.createSpeechRecognizer(this);
    onniSpeechIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    onniSpeechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    onniSpeechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-CO");
    onniSpeechIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
    onniSpeechIntent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
    onniSpeechIntent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, false);

    onniSpeechRecognizer.setRecognitionListener(
        new RecognitionListener() {
          @Override
          public void onReadyForSpeech(Bundle params) {
            dispatchOnniVoiceEvent("voice:start", null);
          }

          @Override
          public void onBeginningOfSpeech() {}

          @Override
          public void onRmsChanged(float rmsdB) {}

          @Override
          public void onBufferReceived(byte[] buffer) {}

          @Override
          public void onEndOfSpeech() {}

          @Override
          public void onError(int error) {
            dispatchOnniVoiceError(mapOnniSpeechError(error), "Error de reconocimiento de voz.");
            dispatchOnniVoiceEvent("voice:end", null);
          }

          @Override
          public void onResults(Bundle results) {
            dispatchOnniVoiceResult(results, true);
            dispatchOnniVoiceEvent("voice:end", null);
          }

          @Override
          public void onPartialResults(Bundle partialResults) {
            dispatchOnniVoiceResult(partialResults, false);
          }

          @Override
          public void onEvent(int eventType, Bundle params) {}
        });
  }

  private void startOnniListening() {
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        != PackageManager.PERMISSION_GRANTED) {
      pendingOnniStartListening = true;
      launchOnniMicrophonePermissionFlow("");
      return;
    }
    ensureOnniVoiceRecognizer();
    if (onniSpeechRecognizer == null || onniSpeechIntent == null) {
      return;
    }
    try {
      onniSpeechRecognizer.cancel();
      onniSpeechRecognizer.startListening(onniSpeechIntent);
    } catch (Exception ignored) {
      dispatchOnniVoiceError("start_failed", "No se pudo iniciar el micrófono.");
      dispatchOnniVoiceEvent("voice:end", null);
    }
  }

  private void stopOnniListening() {
    if (onniSpeechRecognizer == null) {
      return;
    }
    try {
      onniSpeechRecognizer.stopListening();
    } catch (Exception ignored) {
      // no-op
    }
  }

  private void ensureOnniTts() {
    if (onniTts != null) {
      return;
    }
    onniTtsReady = false;
    onniTts = new TextToSpeech(this, status -> {
      if (status == TextToSpeech.SUCCESS) {
        onniTtsLocale = selectOnniBestLocale();
        int languageStatus = onniTts.setLanguage(onniTtsLocale);
        onniTtsReady =
            languageStatus != TextToSpeech.LANG_MISSING_DATA
                && languageStatus != TextToSpeech.LANG_NOT_SUPPORTED;
        if (onniTtsReady) {
          onniTts.setSpeechRate(1.08f);
          onniTts.setPitch(1.0f);
          selectOnniBestVoice();
        }
      } else {
        onniTtsReady = false;
      }
    });
  }

  private Locale selectOnniBestLocale() {
    Locale[] preferred = {
      new Locale("es", "CO"),
      new Locale("es", "MX"),
      new Locale("es", "US"),
      new Locale("es", "ES"),
      new Locale("es")
    };
    for (Locale candidate : preferred) {
      int result = onniTts.setLanguage(candidate);
      if (result != TextToSpeech.LANG_MISSING_DATA && result != TextToSpeech.LANG_NOT_SUPPORTED) {
        return candidate;
      }
    }
    return new Locale("es", "CO");
  }

  private void selectOnniBestVoice() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP || onniTts == null) {
      return;
    }
    try {
      Set<Voice> voices = onniTts.getVoices();
      if (voices == null || voices.isEmpty()) {
        return;
      }
      Voice best = null;
      int bestScore = Integer.MIN_VALUE;
      for (Voice voice : voices) {
        if (voice == null || voice.getLocale() == null) {
          continue;
        }
        Locale locale = voice.getLocale();
        if (!"es".equalsIgnoreCase(locale.getLanguage())) {
          continue;
        }
        int score = 0;
        String country = locale.getCountry() != null ? locale.getCountry().toUpperCase(Locale.ROOT) : "";
        if ("CO".equals(country)) score += 45;
        else if ("MX".equals(country)) score += 35;
        else if ("ES".equals(country)) score += 30;
        else score += 20;
        score += Math.max(0, voice.getQuality());
        score -= Math.max(0, voice.getLatency() / 2);
        if (voice.isNetworkConnectionRequired()) score -= 40;
        if (score > bestScore) {
          bestScore = score;
          best = voice;
        }
      }
      if (best != null) {
        onniTts.setVoice(best);
      }
    } catch (Exception ignored) {
      // Fallback: usar locale por defecto cuando no se puede elegir voz.
    }
  }

  private String normalizeOnniSpeakText(String raw) {
    String text = raw != null ? raw.trim() : "";
    if (text.isEmpty()) {
      return "";
    }
    text =
        text.replace('\n', ' ')
            .replaceAll("\\s+", " ")
            .replaceAll("([,;:])\\s*", "$1 ")
            .replaceAll("([.!?]){2,}", "$1")
            .replaceAll("\\s+([,.!?;:])", "$1")
            .trim();
    return text;
  }

  private void speakOnni(String text) {
    String normalized = normalizeOnniSpeakText(text);
    if (normalized.isEmpty()) {
      return;
    }
    ensureOnniTts();
    if (onniTts == null || !onniTtsReady) {
      dispatchOnniVoiceError("tts_unavailable", "TextToSpeech no disponible.");
      return;
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
        onniTts.speak(normalized, TextToSpeech.QUEUE_FLUSH, null, "onni-utterance");
      } else {
        //noinspection deprecation
        onniTts.speak(normalized, TextToSpeech.QUEUE_FLUSH, null);
      }
    } catch (Exception ignored) {
      dispatchOnniVoiceError("tts_failed", "No se pudo reproducir voz.");
    }
  }

  private void stopOnniSpeaking() {
    if (onniTts == null) {
      return;
    }
    try {
      onniTts.stop();
    } catch (Exception ignored) {
      // no-op
    }
  }

  private void releaseOnniVoiceEngine() {
    pendingOnniStartListening = false;
    if (onniSpeechRecognizer != null) {
      try {
        onniSpeechRecognizer.destroy();
      } catch (Exception ignored) {
        // no-op
      }
      onniSpeechRecognizer = null;
    }
    if (onniTts != null) {
      try {
        onniTts.stop();
        onniTts.shutdown();
      } catch (Exception ignored) {
        // no-op
      }
      onniTts = null;
    }
    onniTtsReady = false;
    onniTtsLocale = new Locale("es", "CO");
  }

  private String mapOnniSpeechError(int errorCode) {
    switch (errorCode) {
      case SpeechRecognizer.ERROR_AUDIO:
        return "audio";
      case SpeechRecognizer.ERROR_CLIENT:
        return "client";
      case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
        return "permission_denied";
      case SpeechRecognizer.ERROR_NETWORK:
        return "network";
      case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
        return "network_timeout";
      case SpeechRecognizer.ERROR_NO_MATCH:
        return "no_match";
      case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
        return "busy";
      case SpeechRecognizer.ERROR_SERVER:
        return "server";
      case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
        return "speech_timeout";
      default:
        return "unknown";
    }
  }

  private void dispatchOnniVoiceResult(Bundle results, boolean isFinal) {
    if (results == null) {
      return;
    }
    ArrayList<String> list = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
    if (list == null || list.isEmpty()) {
      return;
    }
    String transcript = list.get(0) != null ? list.get(0).trim() : "";
    if (transcript.isEmpty()) {
      return;
    }
    JSONObject payload = new JSONObject();
    try {
      payload.put("text", transcript);
      payload.put("isFinal", isFinal);
    } catch (Exception ignored) {
      return;
    }
    dispatchOnniVoiceEvent("voice:result", payload.toString());
  }

  private void dispatchOnniVoiceError(String code, String message) {
    JSONObject payload = new JSONObject();
    try {
      payload.put("code", code != null ? code : "unknown");
      payload.put("message", message != null ? message : "Error de voz");
    } catch (Exception ignored) {
      return;
    }
    dispatchOnniVoiceEvent("voice:error", payload.toString());
  }

  private void dispatchOnniVoiceEvent(String eventName, String detailJson) {
    Bridge bridge = getBridge();
    WebView webView = bridge != null ? bridge.getWebView() : null;
    if (webView == null || eventName == null || eventName.isEmpty()) {
      return;
    }
    String eventLiteral = JSONObject.quote(eventName);
    String detailLiteral = detailJson != null && !detailJson.isEmpty() ? detailJson : "undefined";
    String code =
        "(function(){try{window.dispatchEvent(new CustomEvent("
            + eventLiteral
            + ",{detail:"
            + detailLiteral
            + "}));}catch(e){console.warn('voice event failed',e);}})();";
    webView.evaluateJavascript(code, null);
  }

  /**
   * Flujo Onni: si ya hay micrófono concedido, responde al JS de inmediato; si no, muestra el
   * diálogo del sistema (Android 6+).
   */
  private void launchOnniMicrophonePermissionFlow(String callbackName) {
    if (callbackName != null && !callbackName.isEmpty()) {
      pendingOnniMicCallback = callbackName;
    }
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
        == PackageManager.PERMISSION_GRANTED) {
      if (callbackName != null && !callbackName.isEmpty()) {
        dispatchOnniMicResult(callbackName, true);
      }
      if (pendingOnniStartListening) {
        pendingOnniStartListening = false;
        startOnniListening();
      }
      return;
    }
    try {
      onniMicPermissionLauncher.launch(new String[] {Manifest.permission.RECORD_AUDIO});
    } catch (Exception ignored) {
      String cb = pendingOnniMicCallback;
      pendingOnniMicCallback = null;
      if (cb != null && !cb.isEmpty()) {
        dispatchOnniMicResult(cb, false);
      }
      if (pendingOnniStartListening) {
        pendingOnniStartListening = false;
        dispatchOnniVoiceError("permission_denied", "Se requiere permiso de micrófono.");
      }
    }
  }

  private void finishOnniMicPermission(Map<String, Boolean> result) {
    String cb = pendingOnniMicCallback;
    pendingOnniMicCallback = null;
    boolean granted =
        Boolean.TRUE.equals(result.get(Manifest.permission.RECORD_AUDIO))
            || ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO)
                == PackageManager.PERMISSION_GRANTED;
    if (cb != null && !cb.isEmpty()) {
      dispatchOnniMicResult(cb, granted);
    }
    if (pendingOnniStartListening) {
      pendingOnniStartListening = false;
      if (granted) {
        startOnniListening();
      } else {
        dispatchOnniVoiceError("permission_denied", "Se requiere permiso de micrófono.");
      }
    }
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
