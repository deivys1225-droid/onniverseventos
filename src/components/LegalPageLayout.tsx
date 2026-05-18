import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { cn } from "@/lib/utils";

type LegalPageLayoutProps = {
  title: string;
  description?: string;
  children: ReactNode;
  topContent?: ReactNode;
};

const LegalPageLayout = ({
  title,
  description,
  children,
  topContent,
}: LegalPageLayoutProps) => {
  const elevated = topContent != null;

  return (
    <div
      className={cn("min-h-screen bg-background", elevated && "relative z-20")}
      {...(elevated ? { "data-camera-page-root": true } : {})}
    >
      <Navbar />
      {topContent != null ? <div className="relative z-20 pt-16">{topContent}</div> : null}
      <main
        className={cn(
          "relative px-6 pb-20",
          elevated ? "z-20" : "z-10",
          topContent != null ? "pt-10 md:pt-12" : "pt-28",
        )}
      >
        <article className="container mx-auto max-w-3xl">
          <header className="mb-10 border-b border-primary/20 pb-8">
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
            {description ? (
              <p className="mt-3 text-sm text-muted-foreground md:text-base">{description}</p>
            ) : null}
          </header>
          <div className="space-y-6 text-sm leading-relaxed text-muted-foreground md:text-base [&_a]:text-primary [&_a]:underline-offset-2 [&_a:hover]:underline [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_strong]:text-foreground">
            {children}
          </div>
        </article>
      </main>
      <Footer />
    </div>
  );
};

export default LegalPageLayout;
