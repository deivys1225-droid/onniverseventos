import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lobbyProject = path.join(root, "Proyecto base1");
const dest = path.join(root, "public", "lobby-inmersivo");

const build = spawnSync("npm", ["run", "build:static-lobby"], {
  cwd: lobbyProject,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const lobbyHtml = path.join(dest, "lobby.html");
const indexHtml = path.join(dest, "index.html");

if (!fs.existsSync(lobbyHtml)) {
  console.error("[sync-lobby-inmersivo] No se genero lobby.html en public/lobby-inmersivo.");
  process.exit(1);
}

if (fs.existsSync(indexHtml)) {
  fs.unlinkSync(indexHtml);
}

fs.renameSync(lobbyHtml, indexHtml);
console.log("[sync-lobby-inmersivo] Listo en public/lobby-inmersivo/index.html");
