import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { MIN_PASSWORD_LENGTH } from '../../lib/authErrors';
import { PasswordField } from '../molecules/PasswordField';
import './ChangePasswordDialog.css';

export interface PasswordChange {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordDialogProps {
  /** For password managers: which account the new password belongs to. */
  username: string;
  onSubmit: (change: PasswordChange) => void;
  onClose: () => void;
  submitting: boolean;
  /** Why the server refused the change. */
  error: string | null;
  succeeded: boolean;
}

type Invalid = 'current' | 'next' | 'confirm';

const TITLE_ID = 'change-password-title';
const ERROR_ID = 'change-password-error';
const FOCUSABLE = 'button:not(:disabled), input:not(:disabled):not([type="hidden"])';

/** Modal dialog to change the signed-in user's password. The fields are uncontrolled: nothing is kept in state. */
export function ChangePasswordDialog({
  username,
  onSubmit,
  onClose,
  submitting,
  error,
  succeeded,
}: ChangePasswordDialogProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const current = useRef<HTMLInputElement>(null);
  const next = useRef<HTMLInputElement>(null);
  const confirm = useRef<HTMLInputElement>(null);
  const done = useRef<HTMLButtonElement>(null);
  const [problem, setProblem] = useState<{ field: Invalid; message: string } | null>(null);
  const shown = problem?.message ?? error;

  // Focus moves into the dialog when it opens and back to what opened it when it closes.
  useEffect(() => {
    const opener = document.activeElement;
    current.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    if (succeeded) done.current?.focus();
  }, [succeeded]);

  // After the server refuses, the fields are enabled again: go back to the current password.
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (wasSubmitting.current && !submitting && error !== null) current.current?.focus();
    wasSubmitting.current = submitting;
  }, [submitting, error]);

  function fail(field: Invalid, message: string) {
    setProblem({ field, message });
    ({ current, next, confirm })[field].current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const currentPassword = current.current?.value ?? '';
    const newPassword = next.current?.value ?? '';
    if (currentPassword === '') return fail('current', 'Enter your current password');
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return fail('next', `The new password needs at least ${MIN_PASSWORD_LENGTH} characters`);
    }
    if (newPassword === currentPassword) return fail('next', 'The new password must be different from the current one');
    if (confirm.current?.value !== newPassword) return fail('confirm', 'The two new passwords do not match');
    setProblem(null);
    onSubmit({ currentPassword, newPassword });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && !submitting) {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== 'Tab') return;
    // Keep the focus inside the dialog while it is open.
    const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const invalid = (field: Invalid) => problem?.field === field || (problem === null && error !== null && field === 'current');
  const describedBy = shown === null ? undefined : ERROR_ID;

  return (
    <div
      className="dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose();
      }}
    >
      <div
        ref={dialog}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        onKeyDown={handleKeyDown}
      >
        <h2 className="dialog__title" id={TITLE_ID}>
          Change password
        </h2>
        {succeeded ? (
          <div className="dialog__body">
            <p className="form-message form-message--success" role="status">
              Password changed. Your other sessions were signed out.
            </p>
            <div className="dialog__actions">
              <button ref={done} type="button" className="button" onClick={onClose}>
                Close
              </button>
            </div>
          </div>
        ) : (
          <form className="dialog__body" method="post" noValidate aria-labelledby={TITLE_ID} onSubmit={handleSubmit}>
            {/* Lets password managers attach the new password to the right account. */}
            <input type="hidden" name="username" autoComplete="username" value={username} readOnly />
            {shown !== null ? (
              <p className="form-message form-message--error" id={ERROR_ID} role="alert">
                {shown}
              </p>
            ) : null}
            <PasswordField
              ref={current}
              id="change-password-current"
              label="Current password"
              name="currentPassword"
              autoComplete="current-password"
              disabled={submitting}
              invalid={invalid('current')}
              describedBy={invalid('current') ? describedBy : undefined}
            />
            <PasswordField
              ref={next}
              id="change-password-new"
              label="New password"
              name="newPassword"
              autoComplete="new-password"
              hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
              disabled={submitting}
              invalid={invalid('next')}
              describedBy={invalid('next') ? describedBy : undefined}
            />
            <PasswordField
              ref={confirm}
              id="change-password-confirm"
              label="Confirm new password"
              name="confirmPassword"
              autoComplete="new-password"
              disabled={submitting}
              invalid={invalid('confirm')}
              describedBy={invalid('confirm') ? describedBy : undefined}
            />
            <div className="dialog__actions">
              <button type="button" className="button button--quiet" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={submitting}>
                {submitting ? 'Changing…' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
