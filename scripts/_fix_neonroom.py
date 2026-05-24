from pathlib import Path

p = Path(r"c:\Users\Davis\Documents\pagina web onniverso\src\components\lobby\NeonRoom.tsx")
text = p.read_text(encoding="utf-8")
needle = "function WallSceneGlbModel({"
first = text.index(needle)
second = text.index(needle, first + 1)
type_line = text.rfind("type HoloScreenKind", 0, first)
text = text[:type_line] + text[second:]
p.write_text(text, encoding="utf-8")
print("fixed", type_line, second)
