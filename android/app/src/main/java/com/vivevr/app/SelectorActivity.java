package com.vivevr.app;

import android.content.Intent;
import android.os.Bundle;
import android.widget.ArrayAdapter;
import android.widget.ListView;

import androidx.appcompat.app.AppCompatActivity;

/**
 * Pantalla nativa del selector de escena (pantalla dividida / 360° / mixto).
 * Invocada desde {@link MainActivity} al pulsar VR, 360 o MT en la web embebida.
 */
public class SelectorActivity extends AppCompatActivity {

  public static final String EXTRA_PREFERRED_SCENE = "preferredScene";
  public static final String EXTRA_SELECTED_SCENE = "selectedScene";

  private static final String[] KEYS = new String[] {"split", "immersive", "mix"};

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_selector);

    String preferred = getIntent().getStringExtra(EXTRA_PREFERRED_SCENE);
    if (preferred == null) {
      preferred = "split";
    }

    final String[] labels =
        new String[] {
          "Pantalla dividida",
          "Escena inmersiva (360°)",
          "Escena mixta",
        };

    ListView listView = findViewById(R.id.scene_list);
    ArrayAdapter<String> adapter =
        new ArrayAdapter<>(this, android.R.layout.simple_list_item_single_choice, labels);
    listView.setAdapter(adapter);

    int checked = 0;
    if ("immersive".equals(preferred)) {
      checked = 1;
    } else if ("mix".equals(preferred)) {
      checked = 2;
    }
    listView.setItemChecked(checked, true);

    listView.setOnItemClickListener(
        (parent, view, position, id) -> {
          Intent result = new Intent();
          result.putExtra(EXTRA_SELECTED_SCENE, KEYS[position]);
          setResult(RESULT_OK, result);
          finish();
        });

    findViewById(R.id.btn_cancel_selector)
        .setOnClickListener(
            v -> {
              setResult(RESULT_CANCELED);
              finish();
            });
  }
}
