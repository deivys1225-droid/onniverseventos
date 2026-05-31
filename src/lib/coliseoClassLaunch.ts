const COLOSSEO_CLASS_LAUNCH_KEY = "onniverso.coliseo.classLaunchUrl";
const COLOSSEO_CLASS_LAUNCH_TS_KEY = "onniverso.coliseo.classLaunchTs";
const MAX_LAUNCH_AGE_MS = 10 * 60 * 1000;

export function stashColiseoClassLaunch(url: string) {
  const normalized = url.trim();
  if (!normalized) return;
  try {
    localStorage.setItem(COLOSSEO_CLASS_LAUNCH_KEY, normalized);
    localStorage.setItem(COLOSSEO_CLASS_LAUNCH_TS_KEY, Date.now().toString());
  } catch {
    // localStorage puede no estar disponible; en ese caso dejamos fallback web.
  }
}

export function consumeColiseoClassLaunch(): string | null {
  try {
    const rawUrl = localStorage.getItem(COLOSSEO_CLASS_LAUNCH_KEY);
    const rawTs = localStorage.getItem(COLOSSEO_CLASS_LAUNCH_TS_KEY);
    localStorage.removeItem(COLOSSEO_CLASS_LAUNCH_KEY);
    localStorage.removeItem(COLOSSEO_CLASS_LAUNCH_TS_KEY);
    if (!rawUrl) return null;
    const ts = Number(rawTs ?? "0");
    if (!Number.isFinite(ts) || ts <= 0) return null;
    if (Date.now() - ts > MAX_LAUNCH_AGE_MS) return null;
    return rawUrl;
  } catch {
    return null;
  }
}

