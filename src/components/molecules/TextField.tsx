import type { Ref } from 'react';
import './Field.css';

export interface TextFieldProps {
  id: string;
  label: string;
  name: string;
  autoComplete: string;
  ref?: Ref<HTMLInputElement>;
  disabled?: boolean;
  invalid?: boolean;
  /** id of the element that describes the field, e.g. the form's error. */
  describedBy?: string | undefined;
}

/** A labelled single-line text input. Uncontrolled: read its value through `ref`. */
export function TextField({ id, label, name, autoComplete, ref, disabled, invalid, describedBy }: TextFieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      <input
        ref={ref}
        className="field__input"
        id={id}
        name={name}
        type="text"
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={describedBy}
      />
    </div>
  );
}
