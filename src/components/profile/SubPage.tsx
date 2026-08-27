import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { StoreLayout } from "@/components/StoreLayout";

/** Shared header + shell for every standalone profile sub-page. */
export function SubPage({
  title,
  subtitle,
  backTo = "/profile",
  children,
}: {
  title: string;
  subtitle?: string;
  backTo?: "/profile" | "/profile/wallet";
  children: ReactNode;
}) {
  return (
    <StoreLayout>
      <div className="min-h-[70vh] bg-secondary/40 pb-12">
        <div className="sticky top-0 z-20 border-b border-border/60 bg-card/95 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3 px-3 py-3 sm:px-5 sm:py-4">
            <Link
              to={backTo}
              aria-label={title}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-secondary/60 text-foreground sm:size-12"
            >
              <ArrowRight className="size-5" />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-lg font-extrabold leading-tight sm:text-2xl">{title}</p>
              {subtitle ? (
                <p className="truncate text-xs leading-tight text-muted-foreground sm:text-sm">
                  {subtitle}
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <div className="mx-auto max-w-3xl space-y-3 p-3 sm:space-y-4 sm:p-5">{children}</div>
      </div>
    </StoreLayout>
  );
}
