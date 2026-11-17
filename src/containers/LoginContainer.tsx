import { useCallback, useState } from 'react';
import { LoginForm, type Credentials } from '../components/organisms/LoginForm';
import { authFailureMessage } from '../lib/authErrors';
import type { SignedOutReason } from '../state/auth';
import { useAuth } from './AuthProvider';

const NOTICES: Record<Exclude<SignedOutReason, null>, string> = {
  expired: 'Your session expired. Sign in again.',
  signedOut: 'You signed out.',
};

/** Owns the sign-in attempt. The password goes straight from the form to the request and is not kept. */
export function LoginContainer() {
  const { state, actions } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async ({ username, password }: Credentials) => {
      setSubmitting(true);
      setError(null);
      const failure = await actions.signIn(username, password);
      // On success the login page is replaced by the platform; there is nothing left to update here.
      if (failure === null) return;
      setError(authFailureMessage(failure));
      setSubmitting(false);
    },
    [actions],
  );

  const reason = state.status === 'signedOut' ? state.reason : null;
  return (
    <LoginForm onSubmit={submit} submitting={submitting} error={error} notice={reason === null ? null : NOTICES[reason]} />
  );
}
