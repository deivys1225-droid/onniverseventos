package com.vivevr.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.SurfaceHolder;
import android.view.SurfaceView;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import com.google.android.material.floatingactionbutton.FloatingActionButton;
import com.pedro.rtmp.utils.ConnectCheckerRtmp;
import com.pedro.rtplibrary.rtmp.RtmpCamera2;

public class LiveStreamingActivity extends AppCompatActivity implements ConnectCheckerRtmp, SurfaceHolder.Callback {

  public static final String EXTRA_STREAM_KEY = "streamKey";
  private static final String LIVEPEER_RTMP_BASE_URL = "rtmp://live.livepeer.com/live";
  private static final int REQUEST_PERMISSIONS_CODE = 2011;
  private static final String STOPPED_REDIRECT_URL = "https://vivevr.vercel.app/transmitir?stopped=1";

  private SurfaceView surfaceView;
  private FloatingActionButton startButton;
  private RtmpCamera2 rtmpCamera2;
  private boolean canStartPreview = false;
  private String pendingStreamKey;
  private boolean shouldNotifyStopped = false;
  private boolean notifiedStopped = false;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_live_streaming);

    surfaceView = findViewById(R.id.svPreview);
    startButton = findViewById(R.id.btnStartStreaming);
    FloatingActionButton closeButton = findViewById(R.id.btnCloseStreaming);
    closeButton.setOnClickListener(v -> {
      shouldNotifyStopped = true;
      finish();
    });
    startButton.setOnClickListener(v -> startFromPendingKey());

    surfaceView.getHolder().addCallback(this);
    rtmpCamera2 = new RtmpCamera2(surfaceView, this);

    pendingStreamKey = readStreamKeyFromIntent(getIntent());
    if (!hasRequiredPermissions()) {
      requestRequiredPermissions();
    } else {
      canStartPreview = true;
      maybeStartPreview();
    }
  }

  public void startStream(String streamKey) {
    if (streamKey == null || streamKey.trim().isEmpty()) {
      Toast.makeText(this, "Stream key invalida", Toast.LENGTH_SHORT).show();
      return;
    }

    String normalized = streamKey.trim();
    String streamUrl = normalized.startsWith("rtmp://")
      ? normalized
      : LIVEPEER_RTMP_BASE_URL + "/" + normalized;

    if (!rtmpCamera2.isOnPreview()) {
      maybeStartPreview();
    }

    if (prepareEncoders()) {
      rtmpCamera2.startStream(streamUrl);
      shouldNotifyStopped = true;
      Toast.makeText(this, "Conectando stream...", Toast.LENGTH_SHORT).show();
    } else {
      Toast.makeText(this, "No se pudo preparar audio/video", Toast.LENGTH_LONG).show();
    }
  }

  private boolean prepareEncoders() {
    boolean preparedAudio = rtmpCamera2.prepareAudio();
    boolean preparedVideo = rtmpCamera2.prepareVideo(1280, 720, 30, 2_000_000, 2);
    return preparedAudio && preparedVideo;
  }

  private void maybeStartPreview() {
    SurfaceHolder holder = surfaceView.getHolder();
    if (!canStartPreview || holder.getSurface() == null || !holder.getSurface().isValid()) {
      return;
    }
    if (!rtmpCamera2.isOnPreview()) {
      rtmpCamera2.startPreview();
    }
  }

  private void startFromPendingKey() {
    if (pendingStreamKey == null || pendingStreamKey.trim().isEmpty()) {
      Toast.makeText(this, "No se recibio stream key en el link", Toast.LENGTH_LONG).show();
      return;
    }
    startStream(pendingStreamKey);
  }

  private String readStreamKeyFromIntent(Intent intent) {
    String byExtra = intent.getStringExtra(EXTRA_STREAM_KEY);
    if (byExtra != null && !byExtra.trim().isEmpty()) return byExtra.trim();

    Uri data = intent.getData();
    if (data != null) {
      String key = data.getQueryParameter("key");
      if (key != null && !key.trim().isEmpty()) return key.trim();
    }
    return null;
  }

  private void stopStreamAndPreview() {
    if (rtmpCamera2 != null) {
      if (rtmpCamera2.isStreaming()) {
        rtmpCamera2.stopStream();
      }
      if (rtmpCamera2.isOnPreview()) {
        rtmpCamera2.stopPreview();
      }
    }
  }

  private boolean hasRequiredPermissions() {
    return ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED
      && ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
  }

  private void requestRequiredPermissions() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      ActivityCompat.requestPermissions(
        this,
        new String[]{Manifest.permission.CAMERA, Manifest.permission.RECORD_AUDIO},
        REQUEST_PERMISSIONS_CODE
      );
    }
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode != REQUEST_PERMISSIONS_CODE) return;
    boolean granted = true;
    for (int result : grantResults) {
      granted = granted && result == PackageManager.PERMISSION_GRANTED;
    }
    if (!granted) {
      Toast.makeText(this, "Permisos de camara/microfono requeridos", Toast.LENGTH_LONG).show();
      finish();
      return;
    }
    canStartPreview = true;
    maybeStartPreview();
  }

  @Override
  protected void onDestroy() {
    stopStreamAndPreview();
    if (shouldNotifyStopped && !notifiedStopped && isFinishing()) {
      notifiedStopped = true;
      try {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(STOPPED_REDIRECT_URL));
        intent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        startActivity(intent);
      } catch (Exception ignored) {
        // No bloquear salida del usuario si falla el deep link de retorno.
      }
    }
    super.onDestroy();
  }

  @Override
  public void surfaceCreated(@NonNull SurfaceHolder holder) {
    maybeStartPreview();
  }

  @Override
  public void surfaceChanged(@NonNull SurfaceHolder holder, int format, int width, int height) {
    maybeStartPreview();
  }

  @Override
  public void surfaceDestroyed(@NonNull SurfaceHolder holder) {
    if (rtmpCamera2 != null && rtmpCamera2.isOnPreview()) {
      rtmpCamera2.stopPreview();
    }
  }

  @Override
  public void onConnectionStartedRtmp(@NonNull String rtmpUrl) {
    // No-op
  }

  @Override
  public void onConnectionSuccessRtmp() {
    // No-op
  }

  @Override
  public void onConnectionFailedRtmp(@NonNull String reason) {
    runOnUiThread(() -> Toast.makeText(this, "Fallo de conexion: " + reason, Toast.LENGTH_LONG).show());
    stopStreamAndPreview();
  }

  @Override
  public void onNewBitrateRtmp(long bitrate) {
    // No-op
  }

  @Override
  public void onDisconnectRtmp() {
    // No-op
  }

  @Override
  public void onAuthErrorRtmp() {
    runOnUiThread(() -> Toast.makeText(this, "Error de autenticacion RTMP", Toast.LENGTH_LONG).show());
  }

  @Override
  public void onAuthSuccessRtmp() {
    // No-op
  }
}
