package com.vivevr.app;

import android.content.Context;
import android.graphics.Canvas;
import android.util.AttributeSet;
import android.view.View;
import android.webkit.WebView;
import android.widget.FrameLayout;

/**
 * Un solo {@link WebView}: en {@link #dispatchDraw} se pinta el mismo frame en la mitad
 * izquierda y derecha (duplicación estéreo por recorte de hardware, sin segundo WebView).
 */
public class StereoContainer extends FrameLayout {

  private WebView webView;

  public StereoContainer(Context context) {
    super(context);
    init();
  }

  public StereoContainer(Context context, AttributeSet attrs) {
    super(context, attrs);
    init();
  }

  private void init() {
    setWillNotDraw(false);
    setClipChildren(false);
    webView = new WebView(getContext());
    webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);
    addView(
        webView,
        new LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT));
  }

  public WebView getWebView() {
    return webView;
  }

  @Override
  protected void dispatchDraw(Canvas canvas) {
    if (webView == null || webView.getVisibility() != View.VISIBLE) {
      super.dispatchDraw(canvas);
      return;
    }
    int w = getWidth();
    int h = getHeight();
    int half = w / 2;
    if (half <= 0 || h <= 0) {
      super.dispatchDraw(canvas);
      return;
    }
    long drawingTime = getDrawingTime();
    canvas.save();
    canvas.clipRect(0, 0, half, h);
    drawChild(canvas, webView, drawingTime);
    canvas.restore();

    canvas.save();
    canvas.clipRect(half, 0, w, h);
    drawChild(canvas, webView, drawingTime);
    canvas.restore();
  }
}
