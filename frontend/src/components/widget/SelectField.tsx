/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from '../ui/Field';
import { cn } from '../../lib/cn';
import { ChevronDown } from 'lucide-react';

export type SelectOption = { value: string | number; label: string; disabled?: boolean };
export type SelectOptGroup = { label: string; options: SelectOption[] };

type Props = {
  name: string;
  label?: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  options: SelectOption[] | SelectOptGroup[];
  valueType?: 'string' | 'number';
  className?: string;
  disabled?: boolean;
  onChange?: (e: any) => void;
};

export function SelectField({
  name,
  label,
  description,
  required,
  options,
  placeholder,
  valueType = 'string',
  className,
  disabled,
}: Props) {
  const isGrouped = Array.isArray(options) && (options as any[])[0] && 'options' in (options as any[])[0];

  return (
    <Field
      name={name}
      label={label}
      required={required}
      description={description}
      render={({ field, id, describedBy, invalid }) => {
        const handleChange: React.ChangeEventHandler<HTMLSelectElement> = (e) => {
          const raw = e.target.value;
          const val = raw === '' ? '' : valueType === 'number' ? Number(raw) : raw;
          field.onChange(val);
        };

        return (
          <div className="relative">
            <select
              id={id}
              name={field.name}
              value={field.value ?? ''}
              onChange={handleChange}
              onBlur={field.onBlur}
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              disabled={disabled}
              className={cn('select pr-9', invalid && 'border-[color:var(--danger)]', className)}
            >
              {placeholder && (
                <option value="" disabled hidden>
                  {placeholder}
                </option>
              )}

              {!isGrouped &&
                (options as SelectOption[]).map((opt) => (
                  <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))}

              {isGrouped &&
                (options as SelectOptGroup[]).map((grp, i) => (
                  <optgroup key={i} label={grp.label}>
                    {grp.options.map((opt) => (
                      <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                        {opt.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
            </select>

            {/* Chevron décoratif, non-interactif */}
            <div
              className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden
            >
              <ChevronDown size={16} />
            </div>
          </div>
        );
      }}
    />
  );
}
