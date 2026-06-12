import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const errors = [];
const glbUrls = [];

page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (res) => {
  if (res.url().includes(".glb")) glbUrls.push({ url: res.url(), status: res.status() });
});

await page.addInitScript(() => {
  const user = {
    id: "local-test-user",
    aud: "local",
    role: "authenticated",
    app_metadata: { provider: "local" },
    user_metadata: { full_name: "Test", onniverso_local_user: true },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    confirmed_at: new Date().toISOString(),
    last_sign_in_at: new Date().toISOString(),
    identities: [],
    is_anonymous: true,
    factors: [],
  };
  localStorage.setItem("onniverso.local_user.v1", JSON.stringify(user));
});

await page.goto("http://localhost:5173/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(20000);

const info = await page.evaluate(() => {
  const wrap = document.querySelector(".onni-glb-avatar");
  const canvas = document.querySelector(".onni-glb-avatar__canvas");
  const dots = document.querySelector(".onni-dots-avatar");
  let pixels = 0;
  if (canvas instanceof HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (gl && canvas.width > 0) {
      const data = new Uint8Array(canvas.width * canvas.height * 4);
      gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, data);
      for (let i = 3; i < data.length; i += 4) if (data[i] > 20) pixels++;
    }
  }
  return {
    pathname: location.pathname,
    hasGlbWrap: !!wrap,
    wrapOpacity: wrap ? getComputedStyle(wrap.querySelector(".onni-glb-avatar__canvas") || wrap).opacity : null,
    canvasOpacity: canvas ? getComputedStyle(canvas).opacity : null,
    canvasReady: canvas ? canvas.className.includes("opacity-100") : false,
    hasDots: !!dots,
    dotsOpacity: dots?.parentElement ? getComputedStyle(dots.parentElement).opacity : null,
    pixels,
    wrapSize: wrap ? { w: wrap.clientWidth, h: wrap.clientHeight } : null,
  };
});

console.log(JSON.stringify({ info, glbUrls, errors: errors.slice(0, 8) }, null, 2));
await browser.close();
