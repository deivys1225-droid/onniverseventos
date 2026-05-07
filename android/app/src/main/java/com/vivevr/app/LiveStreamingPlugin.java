package com.vivevr.app;

import android.content.Intent;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "LiveStreaming")
public class LiveStreamingPlugin extends Plugin {

  @PluginMethod
  public void startLiveStreaming(PluginCall call) {
    String streamKey = call.getString("streamKey", "").trim();
    if (streamKey.isEmpty()) {
      call.reject("streamKey es requerido");
      return;
    }

    Intent intent = new Intent(getContext(), LiveStreamingActivity.class);
    intent.putExtra(LiveStreamingActivity.EXTRA_STREAM_KEY, streamKey);
    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    getContext().startActivity(intent);

    JSObject result = new JSObject();
    result.put("started", true);
    call.resolve(result);
  }
}
