import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { apiError, deferred, fakeBackend, PASSWORD, type FakeBackend } from '../test/fakeBackend';
import { AuthenticatedApp } from './AuthenticatedApp';

const NEW_PASSWORD = 'a much longer passphrase';

async function openDialog(backend: FakeBackend = fakeBackend({ signedIn: true })) {
  const user = userEvent.setup();
  window.history.replaceState(null, '', '/');
  render(<AuthenticatedApp client={backend.client} connect={backend.connect} />);
  await screen.findByRole('region', { name: 'Top movers' });
  const opener = screen.getByRole('button', { name: 'Change password' });
  await user.click(opener);
  const dialog = screen.getByRole('dialog', { name: 'Change password' });
  const fill = async (current: string, next: string, confirm = next) => {
    if (current) await user.type(within(dialog).getByLabelText('Current password'), current);
    if (next) await user.type(within(dialog).getByLabelText('New password'), next);
    if (confirm) await user.type(within(dialog).getByLabelText('Confirm new password'), confirm);
    await user.click(within(dialog).getByRole('button', { name: 'Change password' }));
  };
  return { user, backend, opener, dialog, fill, passwordCalls: () => backend.authCalls('/api/auth/password') };
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('change password', () => {
  it('opens a modal dialog with labelled fields and the focus on the current password', async () => {
    const { dialog } = await openDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const current = within(dialog).getByLabelText('Current password');
    expect(current).toHaveFocus();
    expect(current).toHaveAttribute('autocomplete', 'current-password');
    expect(current).toHaveAttribute('type', 'password');
    const next = within(dialog).getByLabelText('New password');
    expect(next).toHaveAttribute('autocomplete', 'new-password');
    expect(next).toHaveAccessibleDescription('At least 12 characters.');
    expect(within(dialog).getByLabelText('Confirm new password')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('changes the password and confirms it', async () => {
    const { dialog, fill, passwordCalls, backend, user, opener } = await openDialog();
    await fill(PASSWORD, NEW_PASSWORD);

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Password changed. Your other sessions were signed out.',
    );
    expect(passwordCalls()).toEqual([
      { method: 'POST', path: '/api/auth/password', body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD } },
    ]);
    expect(backend.state.password).toBe(NEW_PASSWORD);
    expect(document.documentElement.outerHTML).not.toContain(NEW_PASSWORD);
    for (const input of document.querySelectorAll('input')) expect(input.value).not.toBe(NEW_PASSWORD);

    const close = within(dialog).getByRole('button', { name: 'Close' });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    // Still signed in, in the same platform.
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });

  it('requires at least 12 characters before sending anything', async () => {
    const { dialog, fill, passwordCalls } = await openDialog();
    await fill(PASSWORD, 'short');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('The new password needs at least 12 characters');
    expect(within(dialog).getByLabelText('New password')).toHaveFocus();
    expect(within(dialog).getByLabelText('New password')).toBeInvalid();
    expect(passwordCalls()).toEqual([]);
  });

  it('requires the confirmation to match', async () => {
    const { dialog, fill, passwordCalls } = await openDialog();
    await fill(PASSWORD, NEW_PASSWORD, 'something else entirely');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('The two new passwords do not match');
    expect(within(dialog).getByLabelText('Confirm new password')).toHaveFocus();
    expect(passwordCalls()).toEqual([]);
  });

  it('requires the current password and a different new one', async () => {
    const { dialog, fill, passwordCalls, user } = await openDialog();
    await fill('', NEW_PASSWORD);
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Enter your current password');
    await user.type(within(dialog).getByLabelText('Current password'), `${NEW_PASSWORD}{Enter}`);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'The new password must be different from the current one',
    );
    expect(passwordCalls()).toEqual([]);
  });

  it('says the current password is wrong and stays signed in', async () => {
    const { dialog, fill, passwordCalls } = await openDialog();
    await fill('not my password', NEW_PASSWORD);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('The current password is wrong');
    await waitFor(() => expect(within(dialog).getByLabelText('Current password')).toHaveFocus());
    expect(passwordCalls()).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('explains a password the server finds too weak', async () => {
    const { dialog, fill, backend } = await openDialog();
    backend.state.intercept = (call) =>
      call.path === '/api/auth/password' ? apiError(400, 'WEAK_PASSWORD') : undefined;
    await fill(PASSWORD, NEW_PASSWORD);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Use at least 12 characters, different from the current password',
    );
  });

  it('is disabled while the change is being sent', async () => {
    const { dialog, fill, backend, passwordCalls, user } = await openDialog();
    const pending = deferred<Response>();
    backend.state.intercept = (call) => (call.path === '/api/auth/password' ? pending.promise : undefined);
    await fill(PASSWORD, NEW_PASSWORD);

    const submit = within(dialog).getByRole('button', { name: 'Changing…' });
    expect(submit).toBeDisabled();
    expect(within(dialog).getByLabelText('Current password')).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(passwordCalls()).toHaveLength(1);

    await act(async () => pending.resolve(new Response(null, { status: 204 })));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Password changed');
  });

  it('goes to the login page when the session expired meanwhile', async () => {
    const { fill, backend } = await openDialog();
    backend.state.signedIn = false;
    await fill(PASSWORD, NEW_PASSWORD);
    expect(await screen.findByRole('form', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with Escape or Cancel and returns the focus to its button', async () => {
    const { user, opener } = await openDialog();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps keyboard focus inside the dialog', async () => {
    const { user, dialog } = await openDialog();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Change password' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByLabelText('Current password')).toHaveFocus();
  });
});
