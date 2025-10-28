/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, useFormContext } from 'react-hook-form';
import { useId, useMemo } from 'react';
import { cn } from '../../lib/cn';

export function Field({
  name,
  label,
  required,
  description,
  className,
  render,
}: {
  name: string;
  label?: string;
  required?: boolean;
  description?: string;
  className?: string;
  render: (args: {
    field: any;
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => React.ReactNode;
}) {
  const { control, formState } = useFormContext<any>();
  const baseId = useId();
  const ids = useMemo(
    () => ({
      input: `${baseId}-input`,
      help: `${baseId}-help`,
      err: `${baseId}-error`,
    }),
    [baseId]
  );

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const errNode: any = get(formState.errors, name);
        const touched = !!get(formState.touchedFields, name);
        const shouldShow = touched || formState.isSubmitted || formState.submitCount > 0;
        const error = shouldShow ? (errNode?.message as string | undefined) : undefined;
        const describedBy = error ? ids.err : description ? ids.help : undefined;

        return (
          <div className={cn('space-y-1.5', className)}>
            {label && (
              <label htmlFor={ids.input} className="text-sm text-zinc-700">
                {label} {required && <span className="text-rose-600">*</span>}
              </label>
            )}

            {render({ field: { ...field, id: ids.input }, id: ids.input, describedBy, invalid: !!error })}

            {description && !error && (
              <p id={ids.help} className="text-xs text-zinc-500">
                {description}
              </p>
            )}
            {error && (
              <p id={ids.err} className="text-xs text-rose-600">
                {error}
              </p>
            )}
          </div>
        );
      }}
    />
  );
}

function get(obj: any, path: string) {
  return path.split('.').reduce((acc: any, k: string) => (acc ? acc[k] : undefined), obj);
}
