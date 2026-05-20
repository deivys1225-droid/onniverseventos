import { lazy, type ComponentType, type LazyExoticComponent } from "react";

type DynamicOptions = {
  /** En Vite SPA siempre es cliente; se respeta la API de next/dynamic. */
  ssr?: boolean;
};

/**
 * Equivalente a `next/dynamic` para este proyecto Vite.
 * Con `{ ssr: false }` el módulo solo se carga en el cliente vía React.lazy.
 */
export function dynamic<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  _options?: DynamicOptions,
): LazyExoticComponent<ComponentType<P>> {
  return lazy(loader);
}
