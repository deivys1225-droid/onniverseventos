package com.vivevr.app;

import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;

/**
 * Único punto de decisión VR: el WebView solo envía streamId; el usuario elige escena aquí.
 */
public class SelectorActivity extends AppCompatActivity {

  private static final String TAG = "OnniversoSelector";

  public static final String EXTRA_PLAYBACK_URL = StreamExtras.PLAYBACK_URL;
  public static final String EXTRA_PLAYBACK_ID = StreamExtras.PLAYBACK_ID;

  private String streamId = "";
  private String resolvedPlaybackUrl = "";
  private String playbackId = "";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_scene_selector);

    streamId = safeExtra(StreamExtras.STREAM_ID);
    String streamUrl = safeExtra(StreamExtras.STREAM_URL);
    String playbackUrl = safeExtra(EXTRA_PLAYBACK_URL);
    playbackId = safeExtra(EXTRA_PLAYBACK_ID);

    String urlCandidate = firstNonEmpty(streamUrl, playbackUrl);
    if (urlCandidate.isEmpty() && StreamUrlResolver.isPlayableHttpUrl(streamId)) {
      urlCandidate = streamId;
    }
    if (playbackId.isEmpty() && !StreamUrlResolver.isPlayableHttpUrl(streamId)) {
      playbackId = streamId;
    }
    if (playbackId.isEmpty() && !urlCandidate.isEmpty()) {
      playbackId = StreamUrlResolver.extractMuxPlaybackIdFromHls(urlCandidate);
    }

    resolvedPlaybackUrl = StreamUrlResolver.resolve(urlCandidate, playbackId);

    Log.d(TAG, "SelectorActivity streamId=" + streamId + " resolved=" + resolvedPlaybackUrl);

    if (resolvedPlaybackUrl.isEmpty()) {
      Toast.makeText(this, "Falta streamId o playback válido.", Toast.LENGTH_LONG).show();
      finish();
      return;
    }

    MaterialButton immersive = findViewById(R.id.btn_scene_immersive);
    MaterialButton split = findViewById(R.id.btn_scene_split);
    MaterialButton mix = findViewById(R.id.btn_scene_mix);
    MaterialButton cancel = findViewById(R.id.btn_selector_cancel);

    immersive.setOnClickListener(v -> openScene("immersive"));
    split.setOnClickListener(v -> openScene("split"));
    mix.setOnClickListener(v -> openScene("mix"));
    cancel.setOnClickListener(v -> finish());
  }

  private void openScene(String scene) {
    Log.d(TAG, "Scene selected: " + scene + " streamId=" + streamId);
    Intent intent = new Intent(this, PlayerActivity.class);
    intent.putExtra(PlayerActivity.EXTRA_SELECTED_SCENE, scene);
    intent.putExtra(StreamExtras.STREAM_ID, streamId);
    intent.putExtra(StreamExtras.STREAM_URL, resolvedPlaybackUrl);
    intent.putExtra(PlayerActivity.EXTRA_PLAYBACK_URL, resolvedPlaybackUrl);
    if (!playbackId.isEmpty()) {
      intent.putExtra(PlayerActivity.EXTRA_PLAYBACK_ID, playbackId);
    }
    startActivity(intent);
    finish();
  }

  private String safeExtra(String key) {
    String v = getIntent().getStringExtra(key);
    return v != null ? v.trim() : "";
  }

  private static String firstNonEmpty(String a, String b) {
    if (a != null && !a.isEmpty()) return a;
    if (b != null && !b.isEmpty()) return b;
    return "";
  }
}
