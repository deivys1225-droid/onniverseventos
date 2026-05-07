export function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim();
  if (typeof error === "string" && error.trim()) return error.trim();
  if (error && typeof error === "object") {
    const maybe = error as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts: string[] = [];
    if (typeof maybe.message === "string" && maybe.message.trim()) parts.push(maybe.message.trim());
    if (typeof maybe.details === "string" && maybe.details.trim()) parts.push(maybe.details.trim());
    if (typeof maybe.hint === "string" && maybe.hint.trim()) parts.push(maybe.hint.trim());
    if (parts.length > 0) return parts.join(" | ");
    if (typeof maybe.code === "string" && maybe.code.trim()) return `Error ${maybe.code.trim()}`;
  }
  return fallback;
}
