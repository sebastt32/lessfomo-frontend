import './AccountMenu.css';

export interface AccountMenuProps {
  username: string;
  onChangePassword: () => void;
  onSignOut: () => void;
  signingOut: boolean;
  /** Why signing out failed. */
  error: string | null;
}

/** Who is signed in, with the account actions. */
export function AccountMenu({ username, onChangePassword, onSignOut, signingOut, error }: AccountMenuProps) {
  return (
    <div className="account" role="group" aria-label="Cuenta">
      <p className="account__user">
        Sesión iniciada como <strong>{username}</strong>
      </p>
      <button type="button" className="button button--quiet button--small" onClick={onChangePassword}>
        Cambiar contraseña
      </button>
      <button type="button" className="button button--quiet button--small" onClick={onSignOut} disabled={signingOut}>
        {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
      </button>
      {error !== null ? (
        <p className="account__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
