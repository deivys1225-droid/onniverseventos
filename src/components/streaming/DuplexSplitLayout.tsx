import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type DuplexSplitLayoutProps = {
  leftPanel: ReactNode;
  rightPanel?: ReactNode;
  className?: string;
};

/** Pantalla 50/50: dos mitades exactas de la misma altura. */
export function DuplexSplitLayout({ leftPanel, rightPanel, className }: DuplexSplitLayoutProps) {
  return (
    <div
      className={cn("grid min-h-0 flex-1 grid-cols-2 divide-x divide-cyan-500/30", className)}
      role="group"
      aria-label="Vista duplex — pantalla dividida 50/50"
    >
      <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-black">
        <p className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-cyan-200">
          Live
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center p-2">{leftPanel}</div>
      </div>
      <div className="relative flex min-h-0 min-w-0 flex-col overflow-hidden bg-black">
        <p className="absolute left-2 top-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
          Duplex
        </p>
        <div className="flex min-h-0 flex-1 items-center justify-center p-2">
          {rightPanel ?? (
            <p className="px-4 text-center text-sm text-muted-foreground">Mitad derecha</p>
          )}
        </div>
      </div>
    </div>
  );
}
