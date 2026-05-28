package com.vivevr.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

/**
 * Selector VR / Cine Live / Live Cam → {@link PlayerActivity} (ExoPlayer, sin WebView).
 */
public class SelectorActivity extends AppCompatActivity {

  private static final String TAG = "OnniversoSelector";

  public static final String EXTRA_PREFERRED_SCENE = StreamExtras.PREFERRED_SCENE;
  public static final String EXTRA_PLAYBACK_URL = StreamExtras.PLAYBACK_URL;
  public static final String EXTRA_PLAYBACK_ID = StreamExtras.PLAYBACK_ID;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_scene_selector);

    String streamUrl = getIntent().getStringExtra(StreamExtras.STREAM_URL);
    String playbackUrl = getIntent().getStringExtra(EXTRA_PLAYBACK_URL);
    String playbackId = getIntent().getStringExtra(EXTRA_PLAYBACK_ID);
    String urlCandidate =
        streamUrl != null && !streamUrl.trim().isEmpty() ? streamUrl.trim() : playbackUrl;
    String resolvedUrl = StreamUrlResolver.resolve(urlCandidate, playbackId);

    Log.d(TAG, "SelectorActivity — streamUrl ready, scene selection (no WebView)");

    String preferred = normalizeSceneKey(getIntent().getStringExtra(EXTRA_PREFERRED_SCENE));
    if (!"split".equals(preferred) && !resolvedUrl.isEmpty()) {
      openPlayer(preferred, resolvedUrl, playbackId);
      return;
    }

    MaterialButton vr = findViewById(R.id.btn_scene_immersive);
    MaterialButton cine = findViewById(R.id.btn_scene_split);
    MaterialButton liveCam = findViewById(R.id.btn_scene_mix);
    MaterialButton btnColiceo = findViewById(R.id.btn_coliceo);
    MaterialButton cancel = findViewById(R.id.btn_selector_cancel);

    vr.setOnClickListener(
        v -> {
          if (resolvedUrl.isEmpty()) {
            Toast.makeText(this, "Falta streamUrl o playback_id.", Toast.LENGTH_SHORT).show();
            return;
          }
          openPlayer("immersive", resolvedUrl, playbackId);
        });
    cine.setOnClickListener(
        v -> {
          if (resolvedUrl.isEmpty()) {
            Toast.makeText(this, "Falta streamUrl o playback_id.", Toast.LENGTH_SHORT).show();
            return;
          }
          openPlayer("split", resolvedUrl, playbackId);
        });
    liveCam.setOnClickListener(
        v -> {
          if (resolvedUrl.isEmpty()) {
            Toast.makeText(this, "Falta streamUrl o playback_id.", Toast.LENGTH_SHORT).show();
            return;
          }
          openPlayer("mix", resolvedUrl, playbackId);
        });
    btnColiceo.setOnClickListener(
        v -> {
          Intent coliceoIntent = new Intent(this, ColiceoActivity.class);
          coliceoIntent.putExtra(StreamExtras.STREAM_URL, resolvedUrl);
          coliceoIntent.putExtra(StreamExtras.PLAYBACK_URL, resolvedUrl);
          if (playbackId != null && !playbackId.trim().isEmpty()) {
            coliceoIntent.putExtra(StreamExtras.PLAYBACK_ID, playbackId.trim());
          }
          startActivity(coliceoIntent);
        });
    cancel.setOnClickListener(v -> finish());
  }

  private void openPlayer(String scene, String playbackUrl, String playbackId) {
    Log.d(TAG, "Opening PlayerActivity scene=" + scene);
    Intent intent = new Intent(this, PlayerActivity.class);
    intent.putExtra(PlayerActivity.EXTRA_SELECTED_SCENE, scene);
    intent.putExtra(StreamExtras.STREAM_URL, playbackUrl);
    intent.putExtra(PlayerActivity.EXTRA_PLAYBACK_URL, playbackUrl);
    if (playbackId != null && !playbackId.trim().isEmpty()) {
      intent.putExtra(PlayerActivity.EXTRA_PLAYBACK_ID, playbackId.trim());
    }
    startActivity(intent);
    finish();
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
}
