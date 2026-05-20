package com.vivevr.app;

/** Extras compartidos MainActivity → SelectorActivity → PlayerActivity. */
public final class StreamExtras {

  /** ID desde JS: playback_id, user_id, liveId o URL reproducible. */
  public static final String STREAM_ID = "streamId";
  public static final String STREAM_URL = "streamUrl";
  public static final String PLAYBACK_URL = "playbackUrl";
  public static final String PLAYBACK_ID = "playbackId";
  public static final String SELECTED_SCENE = "selectedScene";

  private StreamExtras() {}
}
