import { forwardRef, type ElementType, type PropsWithChildren, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "solid" | "soft" | "ghost";

type BaseProps = PropsWithChildren<{
  as?: ElementType;
  className?: string;
  variant?: Variant;
  elevation?: 0 | 1 | 2 | 3;
  hoverable?: boolean;
  interactive?: boolean;
  inset?: boolean;
  loading?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
}>;

const CardBase = forwardRef<HTMLDivElement, BaseProps>(function Card(
  {
    as,
    className,
    children,
    variant = "soft",
    elevation = 1,
    hoverable = false,
    interactive = false,
    inset = false,
    loading = false,
    header,
    footer,
    ...rest
  },
  ref
) {
  const Comp: ElementType = as ?? "div";

  const bg =
    variant === "solid"
      ? "bg-[color:color-mix(in_oklab,var(--surface)_95%,transparent)]"
      : variant === "soft"
      ? "bg-[color:color-mix(in_oklab,var(--surface)_82%,transparent)]"
      : 
        "bg-[color:color-mix(in_oklab,var(--surface)_68%,transparent)]";

  const border =
    variant === "ghost"
      ? "border-[color:color-mix(in_oklab,var(--border)_60%,transparent)]"
      : "border-token";

  const shadow =
    elevation === 0 ? "shadow-none" : elevation === 1 ? "shadow-sm" : elevation === 2 ? "shadow" : "shadow-lg";

  const hover =
    hoverable &&
    (variant === "ghost"
      ? "transition hover:bg-[color:color-mix(in_oklab,var(--surface)_74%,transparent)]"
      : "transition hover:bg-[color:color-mix(in_oklab,var(--surface)_88%,transparent)]");

  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-2xl border backdrop-blur", 
        bg,
        border,
        shadow,
        hover,
        interactive && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-[color:var(--primary)]/40",
        inset ? "p-3" : "p-3.5",
        className
      )}
      {...rest}
    >
      {header && <div className="mb-2 flex items-center justify-between">{header}</div>}
      {loading ? <CardSkeleton lines={4} /> : children}
      {footer && <div className="mt-3 pt-2 border-t border-token">{footer}</div>}
    </Comp>
  );
});

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "h-4 animate-pulse rounded",
            i === 0 ? "w-4/5" : i === lines - 1 ? "w-2/3" : "w-full",
            "bg-[color:color-mix(in_oklab,var(--surface-contrast)_14%,transparent)]"
          )}
        />
      ))}
    </div>
  );
}

export const Card = Object.assign(CardBase, { Skeleton: CardSkeleton });
export default Card;
