import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Panel } from '../molecules/Panel';
import { PasswordField } from '../molecules/PasswordField';
import { TextField } from '../molecules/TextField';
import './LoginForm.css';

export interface Credentials {
  username: string;
  password: string;
}

export interface LoginFormProps {
  /** Receives the credentials once; the form forgets the password as soon as it hands it over. */
  onSubmit: (credentials: Credentials) => void;
  submitting: boolean;
  /** Why the last attempt failed. */
  error: string | null;
  /** Why the visitor is here, e.g. the session expired. */
  notice?: string | null;
}

const PANEL_ID = 'login';
const ERROR_ID = 'login-error';

/** Username and password. The fields are uncontrolled, so the password never enters React state. */
export function LoginForm({ onSubmit, submitting, error, notice = null }: LoginFormProps) {
  const username = useRef<HTMLInputElement>(null);
  const password = useRef<HTMLInputElement>(null);
  const [missing, setMissing] = useState(false);
  const shown = missing ? 'Escribe tu usuario y tu contraseña' : error;

  useEffect(() => {
    username.current?.focus();
  }, []);

  // After a failed attempt the fields are enabled again: continue where the visitor has to type.
  const wasSubmitting = useRef(false);
  useEffect(() => {
    if (wasSubmitting.current && !submitting && error !== null) {
      (username.current?.value.trim() === '' ? username : password).current?.focus();
    }
    wasSubmitting.current = submitting;
  }, [submitting, error]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const name = username.current?.value.trim() ?? '';
    const secret = password.current?.value ?? '';
    if (name === '' || secret === '') {
      setMissing(true);
      (name === '' ? username : password).current?.focus();
      return;
    }
    setMissing(false);
    if (password.current) password.current.value = '';
    onSubmit({ username: name, password: secret });
  }

  const describedBy = shown === null ? undefined : ERROR_ID;
  return (
    <Panel id={PANEL_ID} title="Iniciar sesión" description="Usa la cuenta que te dio el administrador." className="login-form">
      {/* method="post" keeps the fields out of the URL even if the script fails to load. */}
      <form
        className="login-form__form"
        method="post"
        noValidate
        aria-labelledby={`${PANEL_ID}-title`}
        onSubmit={handleSubmit}
      >
        {notice !== null && shown === null ? (
          <p className="form-message form-message--info" role="status">
            {notice}
          </p>
        ) : null}
        {shown !== null ? (
          <p className="form-message form-message--error" id={ERROR_ID} role="alert">
            {shown}
          </p>
        ) : null}
        <TextField
          ref={username}
          id="login-username"
          label="Usuario"
          name="username"
          autoComplete="username"
          disabled={submitting}
          invalid={shown !== null}
          describedBy={describedBy}
        />
        <PasswordField
          ref={password}
          id="login-password"
          label="Contraseña"
          name="password"
          autoComplete="current-password"
          disabled={submitting}
          invalid={shown !== null}
          describedBy={describedBy}
        />
        <button type="submit" className="button login-form__submit" disabled={submitting}>
          {submitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </Panel>
  );
}
