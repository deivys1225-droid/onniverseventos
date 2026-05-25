/**
 * URL de archivos en /public. Con base `./` y rutas como /3d, evita resolver a /3d/assets/...
 */
export function publicAssetUrl(relativePath: string): string {
  const clean = relativePath.replace(/^\//, "");
  const base = import.meta.env.BASE_URL;
  if (base === "./") {
    return `/${clean}`;
  }
  const prefix = base.endsWith("/") ? base : `${base}/`;
  return `${prefix}${clean}`;
}
