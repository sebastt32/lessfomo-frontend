import { useCallback, useState } from 'react';
import { AccountMenu } from '../components/organisms/AccountMenu';
import { ChangePasswordDialog, type PasswordChange } from '../components/organisms/ChangePasswordDialog';
import { authFailureMessage, passwordChangeFailureMessage } from '../lib/authErrors';
import { useAuth } from './AuthProvider';

interface OpenPasswordDialog {
  status: 'open';
  submitting: boolean;
  error: string | null;
  succeeded: boolean;
}

type PasswordDialog = { status: 'closed' } | OpenPasswordDialog;

const OPEN: OpenPasswordDialog = { status: 'open', submitting: false, error: null, succeeded: false };

/** The signed-in user's name, sign out and change password. Renders nothing unless somebody is signed in. */
export function AccountContainer() {
  const { state, actions } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<PasswordDialog>({ status: 'closed' });

  const signOut = useCallback(async () => {
    setSigningOut(true);
    setSignOutError(null);
    const failure = await actions.signOut();
    // On success the whole platform, this container included, is unmounted.
    if (failure === null) return;
    setSignOutError(`Could not sign out. ${authFailureMessage(failure)}`);
    setSigningOut(false);
  }, [actions]);

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: PasswordChange) => {
      setDialog({ ...OPEN, submitting: true });
      const failure = await actions.changePassword(currentPassword, newPassword);
      setDialog(
        failure === null ? { ...OPEN, succeeded: true } : { ...OPEN, error: passwordChangeFailureMessage(failure) },
      );
    },
    [actions],
  );

  if (state.status !== 'signedIn') return null;
  return (
    <>
      <AccountMenu
        username={state.user.username}
        onChangePassword={() => setDialog(OPEN)}
        onSignOut={signOut}
        signingOut={signingOut}
        error={signOutError}
      />
      {dialog.status === 'open' ? (
        <ChangePasswordDialog
          username={state.user.username}
          onSubmit={changePassword}
          onClose={() => setDialog({ status: 'closed' })}
          submitting={dialog.submitting}
          error={dialog.error}
          succeeded={dialog.succeeded}
        />
      ) : null}
    </>
  );
}
