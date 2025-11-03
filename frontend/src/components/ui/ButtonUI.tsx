/* eslint-disable @typescript-eslint/no-explicit-any */
// src/components/ui/Button.tsx
import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingText?: string;     // texte pendant le chargement (a11y + UX)
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;      // w-full
  iconOnly?: boolean;       // bouton iconique (cercle)
  pressed?: boolean;        // data-state pour styles (toggles)
  asSpan?: boolean;         // utile si on veut un rendu "span" aria-button dans certains cas
};

const sizeMap: Record<Size, string> = {
  sm: 'px-3 py-2 text-sm rounded-lg',
  md: 'px-3.5 py-2.5 rounded-xl',
  lg: 'px-4 py-3 text-base rounded-2xl',
};

const iconOnlySizeMap: Record<Size, string> = {
  sm: 'h-9 w-9 rounded-lg',
  md: 'h-10 w-10 rounded-xl',
  lg: 'h-11 w-11 rounded-2xl',
};

const variantMap: Record<Variant, string> = {
  primary: 'btn btn-primary',
  outline: 'btn btn-outline',
  ghost: 'btn btn-ghost',
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  {
    className,
    variant = 'primary',
    size = 'md',
    loading,
    loadingText,
    leftIcon,
    rightIcon,
    disabled,
    children,
    fullWidth,
    iconOnly,
    pressed,
    asSpan = false,
    ...rest
  },
  ref
) {
  const base = variantMap[variant];
  
  const showRight = !!rightIcon || !!loading;

  const content = (
    <>
      {/* Icône gauche / Spinner */}
      <span
        className={cn(
          'inline-flex items-center justify-center',
          iconOnly ? '' : 'mr-2',
          // réserve un carré de 16px
          'h-4 w-4'
        )}
        aria-hidden
      >
        {loading ? (
          <span
            className="inline-block h-4 w-4 rounded-full border-2 border-[color:var(--border)] border-t-[color:var(--fg)] animate-spin"
          />
        ) : leftIcon ? (
          leftIcon
        ) : (
          <span className="invisible">•</span>
        )}
      </span>

      {/* Texte */}
      <span className={cn(iconOnly && 'sr-only')}>
        {loading && loadingText ? loadingText : children}
      </span>

      {/* Icône droite */}
      {!iconOnly && (
        <span
          className={cn('inline-flex items-center justify-center ml-2 h-4 w-4')}
          aria-hidden
        >
          {showRight ? rightIcon : <span className="invisible">•</span>}
        </span>
      )}
    </>
  );

  const classes = cn(
    base,
    iconOnly ? iconOnlySizeMap[size] : sizeMap[size],
    fullWidth && 'w-full justify-center',
    'disabled:opacity-60 disabled:cursor-not-allowed',
    className
  );

  if (asSpan) {
    return (
      <span
        role="button"
        aria-busy={loading || undefined}
        aria-pressed={pressed || undefined}
        data-state={pressed ? 'on' : 'off'}
        className={classes}
        {...(rest as any)}
      >
        {content}
      </span>
    );
  }

  return (
    <button
      ref={ref}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      aria-pressed={pressed || undefined}
      data-state={pressed ? 'on' : 'off'}
      {...rest}
    >
      {content}
    </button>
  );
});
