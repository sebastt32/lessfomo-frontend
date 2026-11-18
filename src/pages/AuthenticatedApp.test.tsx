import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError, deferred, fakeBackend, PASSWORD, USERNAME, type FakeBackend } from '../test/fakeBackend';
import { AuthenticatedApp } from './AuthenticatedApp';

function renderApp(backend: FakeBackend, url = '/') {
  window.history.replaceState(null, '', url);
  return render(<AuthenticatedApp client={backend.client} connect={backend.connect} />);
}

const loginForm = () => screen.findByRole('form', { name: 'Iniciar sesión' });
const usernameField = () => screen.getByLabelText('Usuario');
const passwordField = () => screen.getByLabelText('Contraseña');
const submitButton = () => screen.getByRole('button', { name: /^Entra(ndo…|r)$/ });
const platformShown = () => screen.findByRole('region', { name: 'Más activos ahora' });

async function signIn(user: ReturnType<typeof userEvent.setup>, password = PASSWORD) {
  await loginForm();
  await user.type(usernameField(), USERNAME);
  await user.type(passwordField(), `${password}{Enter}`);
}

function expectNothingOfThePlatform(backend: FakeBackend) {
  expect(backend.dataCalls()).toEqual([]);
  expect(backend.connect).not.toHaveBeenCalled();
  expect(screen.queryByRole('region', { name: 'Más activos ahora' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Totales del screener' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Vistas' })).not.toBeInTheDocument();
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.history.replaceState(null, '', '/'));

describe('session check on app start', () => {
  it('renders and fetches nothing of the platform while the session is being checked', async () => {
    const backend = fakeBackend({ signedIn: true });
    const pending = deferred<Response>();
    backend.state.intercept = (call) => (call.path === '/api/auth/me' ? pending.promise : undefined);
    renderApp(backend);

    expect(await screen.findByRole('status')).toHaveTextContent('Comprobando tu sesión');
    expectNothingOfThePlatform(backend);
    expect(screen.queryByRole('form', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
  });

  it('opens the platform directly when the session is valid', async () => {
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    expect(await platformShown()).toBeInTheDocument();
    expect(backend.connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
  });

  it('shows the login page, and nothing of the platform, without a session', async () => {
    const backend = fakeBackend();
    renderApp(backend);
    expect(await loginForm()).toBeInTheDocument();
    expect(backend.state.calls).toEqual([{ method: 'GET', path: '/api/auth/me', body: undefined }]);
    expectNothingOfThePlatform(backend);
  });

  it('says the server cannot be reached and checks again on request', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ signedIn: true });
    backend.state.intercept = () => Promise.reject(new TypeError('Failed to fetch'));
    renderApp(backend);

    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede conectar con el servidor');
    expectNothingOfThePlatform(backend);

    backend.state.intercept = null;
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await platformShown()).toBeInTheDocument();
  });
});

describe('login page', () => {
  it('has labelled fields with the right autocomplete hints and focuses the username', async () => {
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    expect(usernameField()).toHaveAttribute('autocomplete', 'username');
    expect(usernameField()).toHaveFocus();
    expect(passwordField()).toHaveAttribute('autocomplete', 'current-password');
    expect(passwordField()).toHaveAttribute('type', 'password');
    expect(screen.getByRole('heading', { level: 1, name: 'lessfomo' })).toBeInTheDocument();
  });

  it('offers the color theme toggle', async () => {
    const user = userEvent.setup();
    renderApp(fakeBackend());
    await loginForm();
    await user.click(screen.getByRole('button', { name: 'Oscuro' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(screen.getByRole('button', { name: 'Auto' }));
  });

  it('shows and hides the password', async () => {
    const user = userEvent.setup();
    renderApp(fakeBackend());
    await loginForm();
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(passwordField()).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(passwordField()).toHaveAttribute('type', 'password');
  });

  it('signs in with Enter and opens the platform with the username in the header', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await signIn(user);

    expect(await platformShown()).toBeInTheDocument();
    expect(backend.authCalls('/api/auth/login')).toEqual([
      { method: 'POST', path: '/api/auth/login', body: { username: USERNAME, password: PASSWORD } },
    ]);
    expect(screen.getByRole('group', { name: 'Cuenta' })).toHaveTextContent(`Sesión iniciada como ${USERNAME}`);
    expect(backend.connect).toHaveBeenCalledTimes(1);
  });

  it('leaves no trace of the password after signing in', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    const logged = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')];
    renderApp(backend, '/?view=record');
    await signIn(user);
    await screen.findByRole('region', { name: /Registro diario/ });

    expect(document.documentElement.outerHTML).not.toContain(PASSWORD);
    for (const input of document.querySelectorAll('input')) expect(input.value).not.toBe(PASSWORD);
    expect(window.location.href).not.toContain(encodeURIComponent(PASSWORD));
    expect(window.location.href).not.toContain('password');
    expect(JSON.stringify({ ...window.localStorage })).not.toContain(PASSWORD);
    expect(JSON.stringify({ ...window.sessionStorage })).not.toContain(PASSWORD);
    for (const spy of logged) {
      expect(JSON.stringify(spy.mock.calls)).not.toContain(PASSWORD);
      spy.mockRestore();
    }
  });

  it('says "Usuario o contraseña incorrectos", empties the password and puts the focus back on it', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await signIn(user, 'not the password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos');
    expect(passwordField()).toHaveValue('');
    await waitFor(() => expect(passwordField()).toHaveFocus());
    expect(passwordField()).toHaveAccessibleDescription('Usuario o contraseña incorrectos');
    expect(usernameField()).toHaveValue(USERNAME);
    expectNothingOfThePlatform(backend);
  });

  it('says how long to wait after too many attempts', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    backend.state.intercept = (call) =>
      call.path === '/api/auth/login' ? apiError(429, 'TOO_MANY_ATTEMPTS', { 'Retry-After': '840' }) : undefined;
    await signIn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos. Intenta de nuevo en 14 minutos.');
  });

  it('says "No se puede conectar con el servidor" on a network failure', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    backend.state.intercept = () => Promise.reject(new TypeError('Failed to fetch'));
    await signIn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('No se puede conectar con el servidor');
  });

  it('asks for both fields before sending anything', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    await user.type(usernameField(), `${USERNAME}{Enter}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe tu usuario y tu contraseña');
    expect(passwordField()).toHaveFocus();
    expect(backend.authCalls('/api/auth/login')).toEqual([]);
  });

  it('is disabled while submitting and sends the login once', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    const pending = deferred<Response>();
    backend.state.intercept = (call) => (call.path === '/api/auth/login' ? pending.promise : undefined);
    await signIn(user);

    expect(submitButton()).toBeDisabled();
    expect(submitButton()).toHaveTextContent('Entrando…');
    expect(usernameField()).toBeDisabled();
    expect(passwordField()).toBeDisabled();
    // The password leaves the field as soon as it is sent.
    expect(passwordField()).toHaveValue('');
    await user.click(submitButton());
    expect(backend.authCalls('/api/auth/login')).toHaveLength(1);

    await act(async () => pending.resolve(apiError(401, 'INVALID_CREDENTIALS')));
    await waitFor(() => expect(submitButton()).toBeEnabled());
    expect(usernameField()).toBeEnabled();
  });

  it('keeps the shared link: the URL is untouched while signed out and opens its view after signing in', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    const url = '/?view=record&day=2026-11-16';
    renderApp(backend, url);
    await loginForm();
    expect(window.location.pathname + window.location.search).toBe(url);

    await signIn(user);
    expect(await screen.findByRole('region', { name: /Registro diario/ })).toBeInTheDocument();
    expect(window.location.pathname + window.location.search).toBe(url);
    const listCall = backend.dataCalls().find((call) => call.path.startsWith('/api/tokens?'));
    expect(listCall?.path).toContain(`from=${new Date(2026, 10, 16).toISOString()}`);
    expect(listCall?.path).toContain('dateField=appearedAt');
  });
});

describe('session lost', () => {
  it('returns to the login page and closes the stream when any request answers 401', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    await platformShown();

    backend.state.signedIn = false;
    await user.click(screen.getByRole('link', { name: 'Registro diario' }));

    expect(await loginForm()).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Tu sesión expiró. Inicia sesión de nuevo.');
    expect(backend.streams[0]?.close).toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: /Registro diario/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Vistas' })).not.toBeInTheDocument();

    const before = backend.state.calls.length;
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(backend.state.calls).toHaveLength(before);
  });

  it('returns to the login page when the stream is rejected because the session expired', async () => {
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    await platformShown();

    backend.state.signedIn = false;
    act(() => backend.streams[0]?.options.onRejected?.());

    expect(await loginForm()).toBeInTheDocument();
    expect(backend.streams[0]?.close).toHaveBeenCalled();
  });

  it('stays in the platform when a stream is rejected but the session is still valid', async () => {
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    await platformShown();
    act(() => backend.streams[0]?.options.onRejected?.());
    await waitFor(() => expect(backend.authCalls('/api/auth/me')).toHaveLength(2));
    expect(screen.getByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
  });
});

describe('sign out', () => {
  it('ends the session, returns to the login page and keeps nothing of the previous session', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    await platformShown();
    expect(await screen.findAllByText('FROG')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    expect(await loginForm()).toBeInTheDocument();
    expect(backend.authCalls('/api/auth/logout')).toEqual([{ method: 'POST', path: '/api/auth/logout', body: undefined }]);
    expect(backend.streams[0]?.close).toHaveBeenCalled();
    expect(screen.queryByText('FROG')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Cerraste sesión.');
    expect(usernameField()).toHaveValue('');

    // A new session starts from scratch: a remounted tree, a new stream and freshly fetched data.
    backend.state.symbol = 'NEWT';
    const dataCallsBefore = backend.dataCalls().length;
    await signIn(user);
    await platformShown();
    expect(await screen.findAllByText('NEWT')).not.toHaveLength(0);
    expect(screen.queryByText('FROG')).not.toBeInTheDocument();
    expect(backend.connect).toHaveBeenCalledTimes(2);
    expect(backend.dataCalls().length).toBeGreaterThan(dataCallsBefore);
  });

  it('stays signed in and says so when the server cannot be reached', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    await platformShown();

    backend.state.intercept = (call) =>
      call.path === '/api/auth/logout' ? Promise.reject(new TypeError('Failed to fetch')) : undefined;
    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    expect(await screen.findByText('No se pudo cerrar sesión. No se puede conectar con el servidor')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Más activos ahora' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toBeEnabled();
  });
});

describe('backend without authentication (older version)', () => {
  it('shows the platform as before when /api/auth/me does not exist', async () => {
    const backend = fakeBackend({ auth: false });
    renderApp(backend, '/?view=record');

    expect(await screen.findByRole('region', { name: /Registro diario/ })).toBeInTheDocument();
    expect(backend.connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form', { name: 'Iniciar sesión' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Cuenta' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).not.toBeInTheDocument();
    expect(window.location.search).toBe('?view=record');
  });

  it('asks for a login as soon as that backend starts requiring one', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ auth: false });
    renderApp(backend);
    await platformShown();

    backend.state.intercept = () => apiError(401, 'UNAUTHENTICATED');
    await user.click(screen.getByRole('link', { name: 'Registro diario' }));
    expect(await loginForm()).toBeInTheDocument();
  });
});
