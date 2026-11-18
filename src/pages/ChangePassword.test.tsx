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
  await screen.findByRole('region', { name: 'Más activos ahora' });
  const opener = screen.getByRole('button', { name: 'Cambiar contraseña' });
  await user.click(opener);
  const dialog = screen.getByRole('dialog', { name: 'Cambiar contraseña' });
  const fill = async (current: string, next: string, confirm = next) => {
    if (current) await user.type(within(dialog).getByLabelText('Contraseña actual'), current);
    if (next) await user.type(within(dialog).getByLabelText('Nueva contraseña'), next);
    if (confirm) await user.type(within(dialog).getByLabelText('Confirmación de la nueva contraseña'), confirm);
    await user.click(within(dialog).getByRole('button', { name: 'Cambiar contraseña' }));
  };
  return { user, backend, opener, dialog, fill, passwordCalls: () => backend.authCalls('/api/auth/password') };
}

afterEach(() => window.history.replaceState(null, '', '/'));

describe('change password', () => {
  it('opens a modal dialog with labelled fields and the focus on the current password', async () => {
    const { dialog } = await openDialog();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    const current = within(dialog).getByLabelText('Contraseña actual');
    expect(current).toHaveFocus();
    expect(current).toHaveAttribute('autocomplete', 'current-password');
    expect(current).toHaveAttribute('type', 'password');
    const next = within(dialog).getByLabelText('Nueva contraseña');
    expect(next).toHaveAttribute('autocomplete', 'new-password');
    expect(next).toHaveAccessibleDescription('Al menos 12 caracteres.');
    expect(within(dialog).getByLabelText('Confirmación de la nueva contraseña')).toHaveAttribute('autocomplete', 'new-password');
  });

  it('changes the password and confirms it', async () => {
    const { dialog, fill, passwordCalls, backend, user, opener } = await openDialog();
    await fill(PASSWORD, NEW_PASSWORD);

    expect(await within(dialog).findByRole('status')).toHaveTextContent(
      'Contraseña cambiada. Se cerraron tus otras sesiones.',
    );
    expect(passwordCalls()).toEqual([
      { method: 'POST', path: '/api/auth/password', body: { currentPassword: PASSWORD, newPassword: NEW_PASSWORD } },
    ]);
    expect(backend.state.password).toBe(NEW_PASSWORD);
    expect(document.documentElement.outerHTML).not.toContain(NEW_PASSWORD);
    for (const input of document.querySelectorAll('input')) expect(input.value).not.toBe(NEW_PASSWORD);

    const close = within(dialog).getByRole('button', { name: 'Cerrar' });
    expect(close).toHaveFocus();
    await user.click(close);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    // Still signed in, in the same platform.
    expect(screen.getByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
  });

  it('requires at least 12 characters before sending anything', async () => {
    const { dialog, fill, passwordCalls } = await openDialog();
    await fill(PASSWORD, 'short');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('La nueva contraseña debe tener al menos 12 caracteres');
    expect(within(dialog).getByLabelText('Nueva contraseña')).toHaveFocus();
    expect(within(dialog).getByLabelText('Nueva contraseña')).toBeInvalid();
    expect(passwordCalls()).toEqual([]);
  });

  it('requires the confirmation to match', async () => {
    const { dialog, fill, passwordCalls } = await openDialog();
    await fill(PASSWORD, NEW_PASSWORD, 'something else entirely');
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Las dos contraseñas nuevas no coinciden');
    expect(within(dialog).getByLabelText('Confirmación de la nueva contraseña')).toHaveFocus();
    expect(passwordCalls()).toEqual([]);
  });

  it('requires the current password and a different new one', async () => {
    const { dialog, fill, passwordCalls, user } = await openDialog();
    await fill('', NEW_PASSWORD);
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Escribe tu contraseña actual');
    await user.type(within(dialog).getByLabelText('Contraseña actual'), `${NEW_PASSWORD}{Enter}`);
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'La nueva contraseña debe ser distinta de la actual',
    );
    expect(passwordCalls()).toEqual([]);
  });

  it('says the current password is wrong and stays signed in', async () => {
    const { dialog, fill, passwordCalls } = await openDialog();
    await fill('not my password', NEW_PASSWORD);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('La contraseña actual es incorrecta');
    await waitFor(() => expect(within(dialog).getByLabelText('Contraseña actual')).toHaveFocus());
    expect(passwordCalls()).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
    expect(screen.queryByRole('form', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
  });

  it('explains a password the server finds too weak', async () => {
    const { dialog, fill, backend } = await openDialog();
    backend.state.intercept = (call) =>
      call.path === '/api/auth/password' ? apiError(400, 'WEAK_PASSWORD') : undefined;
    await fill(PASSWORD, NEW_PASSWORD);
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Usa al menos 12 caracteres y una contraseña distinta de la actual',
    );
  });

  it('is disabled while the change is being sent', async () => {
    const { dialog, fill, backend, passwordCalls, user } = await openDialog();
    const pending = deferred<Response>();
    backend.state.intercept = (call) => (call.path === '/api/auth/password' ? pending.promise : undefined);
    await fill(PASSWORD, NEW_PASSWORD);

    const submit = within(dialog).getByRole('button', { name: 'Cambiando…' });
    expect(submit).toBeDisabled();
    expect(within(dialog).getByLabelText('Contraseña actual')).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(passwordCalls()).toHaveLength(1);

    await act(async () => pending.resolve(new Response(null, { status: 204 })));
    expect(await within(dialog).findByRole('status')).toHaveTextContent('Contraseña cambiada');
  });

  it('goes to the login page when the session expired meanwhile', async () => {
    const { fill, backend } = await openDialog();
    backend.state.signedIn = false;
    await fill(PASSWORD, NEW_PASSWORD);
    expect(await screen.findByRole('form', { name: 'Iniciar sesión' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes with Escape or Cancel and returns the focus to its button', async () => {
    const { user, opener } = await openDialog();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();

    await user.click(opener);
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('keeps keyboard focus inside the dialog', async () => {
    const { user, dialog } = await openDialog();
    await user.tab({ shift: true });
    expect(within(dialog).getByRole('button', { name: 'Cambiar contraseña' })).toHaveFocus();
    await user.tab();
    expect(within(dialog).getByLabelText('Contraseña actual')).toHaveFocus();
  });
});
