import type { ReactNode } from "react";
import { Fragment } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Array<{ title: string; href?: string }>;
  extra?: ReactNode;
  actions?: ReactNode;
  /** Hairline under the header. On by default — it is what gives every
   *  page the same structural opening. Turn off only where the page
   *  starts with its own full-bleed surface. */
  divider?: boolean;
}

/**
 * The opening move of every page, and the reason ~30 screens read as one
 * product.
 *
 * The title is weight 500, not 600/700. A 28px line of Heebo at medium with
 * -0.022em tracking has more authority than the same line set bold — bold at
 * display size reads as shouting, and the supporting text below it has been
 * pushed quieter (Overcast, not slate) so the contrast does the work instead.
 * This is Mezmo's "authority through restraint" adapted to a typeface that has
 * to serve Hebrew and Latin equally; a Latin display serif could not.
 *
 * The hairline is Attio's rule that borders — not shadows or coloured bands —
 * are how this interface separates things.
 */
export function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  extra,
  actions,
  divider = true,
}: PageHeaderProps) {
  const desc = description || subtitle;

  return (
    <div className={cn("mb-6", divider && "mb-6 border-b border-(--ds-border-subtle) pb-5")}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <Fragment key={i}>
              {i > 0 && <span aria-hidden="true" className="text-(--ds-text-disabled)">/</span>}
              {b.href ? (
                <a href={b.href} className="transition-colors hover:text-foreground">
                  {b.title}
                </a>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? "text-(--ds-text-secondary)" : undefined}>
                  {b.title}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[28px] font-medium leading-[1.15] tracking-(--ds-track-heading) text-foreground">
            {title}
          </h1>
          {desc && (
            <p className="mb-0 mt-1.5 max-w-2xl text-sm leading-normal text-muted-foreground">
              {desc}
            </p>
          )}
        </div>

        {(actions || extra) && (
          <div className="flex flex-wrap items-center gap-2">{actions || extra}</div>
        )}
      </div>
    </div>
  );
}
