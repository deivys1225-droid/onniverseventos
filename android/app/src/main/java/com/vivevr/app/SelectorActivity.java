package com.vivevr.app;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

/**
 * Sin UI: devuelve al instante la escena preferida y reenvía la URL HLS / playback_id
 * en la maleta para los reproductores nativos (360°, Mixta, Inmersiva).
 */
public class SelectorActivity extends AppCompatActivity {

  public static final String EXTRA_PREFERRED_SCENE = "preferredScene";
  public static final String EXTRA_SELECTED_SCENE = "selectedScene";
  /** Manifiesto HLS (.m3u8) o URL de reproducción Mux. */
  public static final String EXTRA_PLAYBACK_URL = "playbackUrl";
  /** playback_id Mux (alternativa si no hay URL completa). */
  public static final String EXTRA_PLAYBACK_ID = "playbackId";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    String preferred = getIntent().getStringExtra(EXTRA_PREFERRED_SCENE);
    preferred = normalizeSceneKey(preferred);

    String playbackUrl = getIntent().getStringExtra(EXTRA_PLAYBACK_URL);
    String playbackId = getIntent().getStringExtra(EXTRA_PLAYBACK_ID);

    Intent result = new Intent();
    result.putExtra(EXTRA_SELECTED_SCENE, preferred);
    if (playbackUrl != null && !playbackUrl.trim().isEmpty()) {
      result.putExtra(EXTRA_PLAYBACK_URL, playbackUrl.trim());
    }
    if (playbackId != null && !playbackId.trim().isEmpty()) {
      result.putExtra(EXTRA_PLAYBACK_ID, playbackId.trim());
    }
    setResult(RESULT_OK, result);
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
