import type { ReactNode } from "react";
import { Fragment } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  breadcrumbs?: Array<{ title: string; href?: string }>;
  extra?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  description,
  breadcrumbs,
  extra,
  actions
}: PageHeaderProps) {
  const desc = description || subtitle;

  return (
    <div className="mb-6">
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
          {breadcrumbs.map((b, i) => (
            <Fragment key={i}>
              {i > 0 && <span aria-hidden="true" className="text-(--ds-text-tertiary)">/</span>}
              {b.href ? (
                <a href={b.href} className="transition-colors hover:text-foreground">
                  {b.title}
                </a>
              ) : (
                <span className={i === breadcrumbs.length - 1 ? "text-foreground" : undefined}>
                  {b.title}
                </span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="m-0 text-[28px] font-semibold leading-tight text-foreground">{title}</h1>
          {desc && <p className="mb-0 mt-2 text-sm leading-normal text-muted-foreground">{desc}</p>}
        </div>

        {(actions || extra) && (
          <div className="flex flex-wrap items-center gap-2">{actions || extra}</div>
        )}
      </div>
    </div>
  );
}
