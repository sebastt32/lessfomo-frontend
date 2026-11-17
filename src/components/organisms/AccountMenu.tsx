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
    <div className="account" role="group" aria-label="Account">
      <p className="account__user">
        Signed in as <strong>{username}</strong>
      </p>
      <button type="button" className="button button--quiet button--small" onClick={onChangePassword}>
        Change password
      </button>
      <button type="button" className="button button--quiet button--small" onClick={onSignOut} disabled={signingOut}>
        {signingOut ? 'Signing out…' : 'Sign out'}
      </button>
      {error !== null ? (
        <p className="account__error" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
