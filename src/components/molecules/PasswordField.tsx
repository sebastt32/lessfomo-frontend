import { useState, type Ref } from 'react';
import './Field.css';

export interface PasswordFieldProps {
  id: string;
  label: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  ref?: Ref<HTMLInputElement>;
  disabled?: boolean;
  invalid?: boolean;
  /** Short help under the label, e.g. the minimum length. */
  hint?: string;
  /** id of the element that describes the field, e.g. the form's error. */
  describedBy?: string | undefined;
}

/**
 * A labelled password input with a show/hide button. Uncontrolled on purpose: the password only
 * lives in the input, never in React state; read it through `ref`.
 */
export function PasswordField({
  id,
  label,
  name,
  autoComplete,
  ref,
  disabled,
  invalid,
  hint,
  describedBy,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const hintId = hint ? `${id}-hint` : undefined;
  const description = [hintId, describedBy].filter(Boolean).join(' ');
  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {hint ? (
        <p className="field__hint" id={hintId}>
          {hint}
        </p>
      ) : null}
      <div className="field__control">
        <input
          ref={ref}
          className="field__input"
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          disabled={disabled}
          aria-invalid={invalid ? true : undefined}
          aria-describedby={description === '' ? undefined : description}
        />
        <button
          type="button"
          className="button button--quiet field__toggle"
          aria-controls={id}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          disabled={disabled}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </div>
  );
}
