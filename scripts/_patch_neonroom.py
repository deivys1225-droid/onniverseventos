from pathlib import Path

p = Path(r"c:\Users\Davis\Documents\pagina web onniverso\src\components\lobby\NeonRoom.tsx")
text = p.read_text(encoding="utf-8")

start = text.index("{isPantalla1 ?")
end = text.index("{label === 2 && (", start)
new_inner = """{kind === "hub" ? (
            <LobbyScreenOneHub width={embedWidth} height={embedHeight} />
          ) : kind === "salas" ? (
            <LobbyScreenThreeSalasPlayer width={embedWidth} height={embedHeight} />
          ) : (
            <iframe
              key={embedUrl}
              src={embedUrl ?? LOBBY_WEB_EMBED_URL}
              width={embedWidth}
              height={embedHeight}
              title="onnivers.com — Nuestras salas"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              style={{
                border: "0",
                display: "block",
                width: `${embedWidth}px`,
                height: `${embedHeight}px`,
                background: "#02030a",
                pointerEvents: screenPointerEvents,
              }}
            />
          )}"""
text = text[:start] + new_inner + text[end:]
# remove social decor block
start2 = text.index("{label === 2 && (")
end2 = text.index("      <Html", start2)
text = text[:start2] + text[end2:]

old_holo = """// ---------- 4 holographic screens, one centered on each wall ----------
function HoloScreens({
  focusedScreen,
  onFocusScreen,
  screenUrls,
}: {
  focusedScreen: number | null;
  onFocusScreen: (label: number) => void;
  screenUrls: LobbyScreenUrls;
}) {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  const interactionMode = focusedScreen !== null;
  const screenProps = (label: number, embedUrl: string, position: [number, number, number], rotation: [number, number, number]) => ({
    position,
    rotation,
    embedUrl,
    label,
    focused: focusedScreen === label,
    interactionMode,
    onFocus: () => onFocusScreen(label),
  });

  return (
    <>
      {/* Back wall (-Z) */}
      <HoloScreen
        {...screenProps(1, screenUrls[0], [0, y, -half + off], [0, 0, 0])}
      />
      {/* Front wall (+Z) */}
      <HoloScreen
        {...screenProps(2, screenUrls[1], [0, y, half - off], [0, Math.PI, 0])}
      />
      {/* Left wall (-X) */}
      <HoloScreen
        {...screenProps(3, screenUrls[2], [-half + off, y, 0], [0, Math.PI / 2, 0])}
      />
      {/* Right wall (+X): pantalla 4 retirada; Nuestras Salas va en ForcedFloatingVideoScreen */}
    </>
  );
}"""

new_holo = """// ---------- 3 pantallas en la pared 1 (fondo) ----------
function HoloScreens({
  focusedScreen,
  onFocusScreen,
}: {
  focusedScreen: number | null;
  onFocusScreen: (label: number) => void;
}) {
  const half = ROOM_SIZE / 2;
  const y = WALL_HEIGHT / 2;
  const off = 0.03;
  const rot: [number, number, number] = [0, 0, 0];
  const [xHub, xSalas, xWeb] = wall1PanelCenters();
  const interactionMode = focusedScreen !== null;

  const panel = (
    kind: HoloScreenKind,
    label: number,
    x: number,
    width: number,
    embedUrl?: string,
  ) => (
    <HoloScreen
      kind={kind}
      label={label}
      embedUrl={embedUrl}
      position={[x, y, -half + off]}
      rotation={rot}
      width={width}
      height={WALL1_PANEL_HEIGHT}
      focused={focusedScreen === label}
      interactionMode={interactionMode}
      onFocus={() => onFocusScreen(label)}
    />
  );

  return (
    <>
      {panel("hub", 1, xHub, WALL1_HUB_WIDTH)}
      {panel("salas", 2, xSalas, WALL1_SALAS_WIDTH)}
      {panel("webpage", 3, xWeb, WALL1_WEB_WIDTH, LOBBY_WEB_EMBED_URL)}
    </>
  );
}"""

if old_holo not in text:
    raise SystemExit("HoloScreens not found")
text = text.replace(old_holo, new_holo, 1)

start = text.index("/** Iframe fijo a onnivers.com")
end = text.index("// ---------- Modern lounge set", start)
text = text[:start] + text[end:]

for s in [
    'const CENTER_SCREEN_EMBED_URL = "https://onnivers.com/nuestras-salas";\n',
    "/** Tamaño grande del panel Nuestras Salas (antes flotaba en el centro). */\n",
    "const NUESTRAS_SALAS_EMBED_WIDTH = 1024;\n",
    "const NUESTRAS_SALAS_EMBED_HEIGHT = 576;\n",
    "const NUESTRAS_SALAS_HTML_SCALE = 0.5;\n",
    "const NUESTRAS_SALAS_PANEL_WIDTH = WALL_SCREEN_WIDTH * (NUESTRAS_SALAS_EMBED_WIDTH / 800);\n",
    "const NUESTRAS_SALAS_PANEL_HEIGHT = WALL_SCREEN_HEIGHT * (NUESTRAS_SALAS_EMBED_HEIGHT / 450);\n",
]:
    text = text.replace(s, "")

start = text.index("function lobbyAndroidUsesNativePantalla2WebView()")
end = text.index("/**", start + 10)
text = text[:start] + text[end:]

text = text.replace(
    """          <HoloScreens
            focusedScreen={focusedScreen}
            onFocusScreen={focusScreen}
            screenUrls={screenUrls}
          />
          <ForcedFloatingVideoScreen
            position={[ROOM_SIZE / 2 - 0.03, WALL_HEIGHT / 2, 0]}
            rotation={[0, -Math.PI / 2, 0]}
          />""",
    """          <HoloScreens focusedScreen={focusedScreen} onFocusScreen={focusScreen} />""",
)

text = text.replace(
    "  const [screenUrls] = useState<LobbyScreenUrls>(\n    () => readStoredLobbyScreenUrls() ?? defaultLobbyScreenUrls(),\n  );\n",
    "",
)

needle = "  useEffect(() => {\n    if (Capacitor.getPlatform() !== \"android\") return;\n    const bridge = window.Android;"
if needle in text:
    start = text.index(needle)
    end = text.index("  }, [focusedScreen]);\n", start) + len("  }, [focusedScreen]);\n")
    text = text[:start] + text[end:]

p.write_text(text, encoding="utf-8")
print("done")
