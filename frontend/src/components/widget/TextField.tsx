/* eslint-disable @typescript-eslint/no-explicit-any */
import { Field } from '../ui/Field';
import { TextInput, PasswordInput } from '../ui/Input';
import { cn } from '../../lib/cn';

type Props = {
  /** chemin RHF, ex: "email" */
  name: string;
  label?: string;
  description?: string;   // (ex-hint)
  required?: boolean;
  value?: any;
  helper?: string;

  /** icônes décoratives */
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;

  /** type HTML ; "password" active l’eye-toggle natif */
  type?: React.HTMLInputTypeAttribute;

  /** props HTML passés à l’input */
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  className?: string;
  onChange?: (e: any) => void;
  multiline?: boolean;
  readOnly?: boolean;
  rows?: number;  
};


export function TextField({
  name,
  label,
  description,
  required,
  leftIcon,
  rightIcon,
  type = 'text',
  placeholder,
  autoComplete,
  disabled,
  className,
}: Props) {
  const isPassword = type === 'password';

  return (
    <Field
      name={name}
      label={label}
      required={required}
      description={description}
      render={({ field, id, describedBy, invalid }) =>
        isPassword ? (
          <PasswordInput
            id={id}
            name={field.name}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            placeholder={placeholder}
            describedBy={describedBy}
            invalid={invalid}
            disabled={disabled}
            leftIcon={leftIcon}
            // le PasswordInput gère son eye-toggle en rightIcon ; on garde ton rightIcon si tu veux le cumuler
            autoComplete={autoComplete ?? 'current-password'}
            className={className}
          />
        ) : (
          <TextInput
            id={id}
            name={field.name}
            value={field.value ?? ''}
            onChange={field.onChange}
            onBlur={field.onBlur}
            type={type}
            placeholder={placeholder}
            describedBy={describedBy}
            invalid={invalid}
            disabled={disabled}
            leftIcon={leftIcon}
            rightIcon={rightIcon}
            autoComplete={autoComplete}
            className={cn(className)}
          />
        )
      }
    />
  );
}
