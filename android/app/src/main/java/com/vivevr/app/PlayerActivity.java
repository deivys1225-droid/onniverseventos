package com.vivevr.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import androidx.appcompat.app.AppCompatActivity;
import androidx.media3.common.MediaItem;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.ui.PlayerView;

import com.google.android.material.button.MaterialButton;

/**
 * Reproductor exclusivo ExoPlayer (HLS .m3u8, MP4, Cloudinary). Sin WebView.
 */
public class PlayerActivity extends AppCompatActivity {

  private static final String TAG = "OnniversoPlayer";

  public static final String EXTRA_PLAYBACK_URL = "playbackUrl";
  public static final String EXTRA_PLAYBACK_ID = "playbackId";
  public static final String EXTRA_SELECTED_SCENE = "selectedScene";

  private ExoPlayer player;
  private PlayerView playerView;

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_player);

    Log.d(TAG, "PlayerActivity started — ExoPlayer native only");

    playerView = findViewById(R.id.native_player_view);
    MaterialButton closeBtn = findViewById(R.id.native_player_close);
    closeBtn.setOnClickListener(v -> finish());

    String streamUrl = getIntent().getStringExtra(StreamExtras.STREAM_URL);
    String playbackUrl = getIntent().getStringExtra(EXTRA_PLAYBACK_URL);
    String urlCandidate =
        streamUrl != null && !streamUrl.trim().isEmpty() ? streamUrl.trim() : playbackUrl;
    String resolvedUrl =
        StreamUrlResolver.resolve(urlCandidate, getIntent().getStringExtra(EXTRA_PLAYBACK_ID));

    if (resolvedUrl.isEmpty()) {
      Toast.makeText(this, "URL de stream inválida.", Toast.LENGTH_LONG).show();
      finish();
      return;
    }

    Log.d(TAG, "Playing: " + resolvedUrl);

    player = new ExoPlayer.Builder(this).build();
    playerView.setPlayer(player);
    player.setMediaItem(MediaItem.fromUri(Uri.parse(resolvedUrl)));
    player.prepare();
    player.setPlayWhenReady(true);
  }

  @Override
  protected void onStop() {
    super.onStop();
    if (player != null) {
      player.setPlayWhenReady(false);
    }
  }

  @Override
  protected void onDestroy() {
    if (playerView != null) {
      playerView.setPlayer(null);
    }
    if (player != null) {
      player.release();
      player = null;
    }
    super.onDestroy();
  }
}
