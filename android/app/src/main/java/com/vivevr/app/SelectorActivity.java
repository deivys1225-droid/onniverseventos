package com.vivevr.app;

import android.content.Intent;
import android.os.Bundle;

import androidx.appcompat.app.AppCompatActivity;

/**
 * Sin UI: devuelve al instante la escena preferida que envió {@link MainActivity} al abrir el
 * flujo de audiencia (VR / 360 / MT). La lista de modos (pantalla dividida, 360°, mixto, etc.)
 * fue retirada a petición del producto.
 */
public class SelectorActivity extends AppCompatActivity {

  public static final String EXTRA_PREFERRED_SCENE = "preferredScene";
  public static final String EXTRA_SELECTED_SCENE = "selectedScene";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    String preferred = getIntent().getStringExtra(EXTRA_PREFERRED_SCENE);
    preferred = normalizeSceneKey(preferred);

    Intent result = new Intent();
    result.putExtra(EXTRA_SELECTED_SCENE, preferred);
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
