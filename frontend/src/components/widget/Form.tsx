/* eslint-disable @typescript-eslint/no-explicit-any */
import { FormProvider, type FieldValues, type SubmitHandler, type UseFormReturn } from 'react-hook-form';
import { cn } from '../../lib/cn'

type SubmitHandlerFor<
TFieldValues extends FieldValues,
TTransformedValues extends FieldValues | undefined
> = TTransformedValues extends undefined ? SubmitHandler<TFieldValues> : SubmitHandler<TTransformedValues>;


export function Form<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues extends FieldValues | undefined = undefined
>({
  form,
  onSubmit,
  children,
  className,
  noValidate = true,
}: {
  form: UseFormReturn<TFieldValues, TContext, TTransformedValues>;
  onSubmit: SubmitHandlerFor<TFieldValues, TTransformedValues>;
  children: React.ReactNode;
  className?: string;
  noValidate?: boolean;
}) {
  return (
    <FormProvider<TFieldValues, TContext, TTransformedValues> {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit as any)}
        className={cn('space-y-5', className)}
        noValidate={noValidate}
      >
        {children}
      </form>
    </FormProvider>
  );
}

export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card p-4 md:p-5', className)}>
      {(title || description) && (
        <header className="mb-4">
          {title && <h2 className="text-base font-semibold tracking-tight">{title}</h2>}
          {description && <p className="text-sm text-muted">{description}</p>}
        </header>
      )}
      {children}
    </section>
  );
}

export function FormRow({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
  variant = 'stack',
}: {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
  variant?: 'stack' | 'inline' | 'block';
}) {
  if (variant === 'inline') {
    return (
      <div className={cn('grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-4 items-start', className)}>
        {label ? (
          <label htmlFor={htmlFor} className="label md:col-span-1 pt-2">
            {label} {required && <span className="text-[color:var(--danger)]">*</span>}
          </label>
        ) : (
          <div />
        )}
        <div className="md:col-span-2 space-y-1.5">
          {children}
          <RowMessages hint={hint} error={error} />
        </div>
      </div>
    );
  }
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="label">
          {label} {required && <span className="text-[color:var(--danger)]">*</span>}
        </label>
      )}
      {children}
      <RowMessages hint={hint} error={error} />
    </div>
  );
}

function RowMessages({ hint, error }: { hint?: string; error?: string }) {
  if (error) return <p className="text-xs" style={{ color: 'var(--danger)' }}>{error}</p>;
  if (hint) return <p className="text-xs text-muted">{hint}</p>;
  return null;
}
