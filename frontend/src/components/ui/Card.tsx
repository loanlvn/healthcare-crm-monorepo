/* src/components/ui/Card.tsx */
import type {
  HTMLAttributes,
  ReactNode,
  ElementType,
  ForwardRefExoticComponent,
  RefAttributes,
  JSX
} from "react";
import { forwardRef } from "react";
import { cn } from "../../lib/cn";


type Variant = "solid" | "soft" | "ghost";
type Elevation = 0 | 1 | 2 | 3;

type BaseProps = HTMLAttributes<HTMLDivElement> & {
  as?: ElementType;
  variant?: Variant;
  elevation?: Elevation;
  hoverable?: boolean;
  interactive?: boolean;
  inset?: boolean;
  loading?: boolean;
  header?: ReactNode;
  footer?: ReactNode;
};

// ---- Subcomponents props (clairement typés) ----
type HeaderProps = {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
};
type BodyProps = { children: ReactNode; className?: string };
type FooterProps = { children: ReactNode; className?: string };
type SkeletonProps = { lines?: number; className?: string };

// ---- Card component type avec membres statiques ----
type CardComponent = ForwardRefExoticComponent<BaseProps & RefAttributes<HTMLDivElement>> & {
  Header: (p: HeaderProps) => JSX.Element;
  Body: (p: BodyProps) => JSX.Element;
  Footer: (p: FooterProps) => JSX.Element;
  Skeleton: (p: SkeletonProps) => JSX.Element;
};

// ---- Implémentations des sous-composants ----
function CardHeader({ title, subtitle, actions, className }: HeaderProps) {
  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div>
        {title && <div className="font-semibold">{title}</div>}
        {subtitle && <div className="text-sm text-muted">{subtitle}</div>}
      </div>
      {actions}
    </div>
  );
}
function CardBody({ children, className }: BodyProps) {
  return <div className={cn("space-y-2", className)}>{children}</div>;
}
function CardFooter({ children, className }: FooterProps) {
  return <div className={cn("mt-3 pt-2 border-t border-token", className)}>{children}</div>;
}
function CardSkeleton({ lines = 3, className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded bg-[color:color-mix(in_oklab,var(--surface)_85%,var(--border))]"
          style={{ width: `${80 - i * 10}%` }}
        />
      ))}
    </div>
  );
}

// ---- Composant principal ----
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
    variant === "solid" ? "bg-white/90" : variant === "soft" ? "bg-white/60" : "bg-transparent";
  const border = variant === "ghost" ? "border-transparent" : "border-token";
  const shadow =
    elevation === 0 ? "shadow-none" : elevation === 1 ? "shadow-sm" : elevation === 2 ? "shadow" : "shadow-lg";

  return (
    <Comp
      ref={ref}
      className={cn(
        "rounded-2xl border backdrop-blur",
        bg,
        border,
        shadow,
        hoverable && "transition hover:bg-white/70",
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

// ---- Assemblage avec Object.assign et typage final ----
export const Card: CardComponent = Object.assign(CardBase, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
  Skeleton: CardSkeleton,
});
