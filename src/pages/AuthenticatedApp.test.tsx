import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { apiError, deferred, fakeBackend, PASSWORD, USERNAME, type FakeBackend } from '../test/fakeBackend';
import { AuthenticatedApp } from './AuthenticatedApp';

function renderApp(backend: FakeBackend, url = '/') {
  window.history.replaceState(null, '', url);
  return render(<AuthenticatedApp client={backend.client} connect={backend.connect} />);
}

const loginForm = () => screen.findByRole('form', { name: 'Sign in' });
const usernameField = () => screen.getByLabelText('Username');
const passwordField = () => screen.getByLabelText('Password');
const submitButton = () => screen.getByRole('button', { name: /^Sign(ing)? in/ });
const platformShown = () => screen.findByRole('region', { name: 'Top movers' });

async function signIn(user: ReturnType<typeof userEvent.setup>, password = PASSWORD) {
  await loginForm();
  await user.type(usernameField(), USERNAME);
  await user.type(passwordField(), `${password}{Enter}`);
}

function expectNothingOfThePlatform(backend: FakeBackend) {
  expect(backend.dataCalls()).toEqual([]);
  expect(backend.connect).not.toHaveBeenCalled();
  expect(screen.queryByRole('region', { name: 'Top movers' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Screener totals' })).not.toBeInTheDocument();
  expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();
}

beforeEach(() => window.localStorage.clear());
afterEach(() => window.history.replaceState(null, '', '/'));

describe('session check on app start', () => {
  it('renders and fetches nothing of the platform while the session is being checked', async () => {
    const backend = fakeBackend({ signedIn: true });
    const pending = deferred<Response>();
    backend.state.intercept = (call) => (call.path === '/api/auth/me' ? pending.promise : undefined);
    renderApp(backend);

    expect(await screen.findByRole('status')).toHaveTextContent('Checking your session');
    expectNothingOfThePlatform(backend);
    expect(screen.queryByRole('form', { name: 'Sign in' })).not.toBeInTheDocument();
  });

  it('opens the platform directly when the session is valid', async () => {
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    expect(await platformShown()).toBeInTheDocument();
    expect(backend.connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form', { name: 'Sign in' })).not.toBeInTheDocument();
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

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
    expectNothingOfThePlatform(backend);

    backend.state.intercept = null;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
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
    const theme = screen.getByRole('group', { name: 'Color theme' });
    await user.click(within(theme).getByRole('button', { name: 'Dark' }));
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    await user.click(within(theme).getByRole('button', { name: 'Auto' }));
  });

  it('shows and hides the password', async () => {
    const user = userEvent.setup();
    renderApp(fakeBackend());
    await loginForm();
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(passwordField()).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Hide password' }));
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
    expect(screen.getByRole('group', { name: 'Account' })).toHaveTextContent(`Signed in as ${USERNAME}`);
    expect(backend.connect).toHaveBeenCalledTimes(1);
  });

  it('leaves no trace of the password after signing in', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    const logged = [vi.spyOn(console, 'log'), vi.spyOn(console, 'error'), vi.spyOn(console, 'warn')];
    renderApp(backend, '/?view=record');
    await signIn(user);
    await screen.findByRole('region', { name: /Daily record/ });

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

  it('says "Wrong username or password", empties the password and puts the focus back on it', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await signIn(user, 'not the password');

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong username or password');
    expect(passwordField()).toHaveValue('');
    await waitFor(() => expect(passwordField()).toHaveFocus());
    expect(passwordField()).toHaveAccessibleDescription('Wrong username or password');
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
    expect(await screen.findByRole('alert')).toHaveTextContent('Too many attempts. Try again in 14 minutes');
  });

  it('says "Cannot reach the server" on a network failure', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    backend.state.intercept = () => Promise.reject(new TypeError('Failed to fetch'));
    await signIn(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot reach the server');
  });

  it('asks for both fields before sending anything', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend();
    renderApp(backend);
    await loginForm();
    await user.type(usernameField(), `${USERNAME}{Enter}`);
    expect(await screen.findByRole('alert')).toHaveTextContent('Enter your username and password');
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
    expect(submitButton()).toHaveTextContent('Signing in');
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
    expect(await screen.findByRole('region', { name: /Daily record/ })).toBeInTheDocument();
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
    await user.click(screen.getByRole('link', { name: 'Daily record' }));

    expect(await loginForm()).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Your session expired. Sign in again.');
    expect(backend.streams[0]?.close).toHaveBeenCalled();
    expect(screen.queryByRole('region', { name: /Daily record/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Views' })).not.toBeInTheDocument();

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
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
  });
});

describe('sign out', () => {
  it('ends the session, returns to the login page and keeps nothing of the previous session', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ signedIn: true });
    renderApp(backend);
    await platformShown();
    expect(await screen.findAllByText('FROG')).not.toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    expect(await loginForm()).toBeInTheDocument();
    expect(backend.authCalls('/api/auth/logout')).toEqual([{ method: 'POST', path: '/api/auth/logout', body: undefined }]);
    expect(backend.streams[0]?.close).toHaveBeenCalled();
    expect(screen.queryByText('FROG')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('You signed out.');
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
    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(await screen.findByText('Could not sign out. Cannot reach the server')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Top movers' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeEnabled();
  });
});

describe('backend without authentication (older version)', () => {
  it('shows the platform as before when /api/auth/me does not exist', async () => {
    const backend = fakeBackend({ auth: false });
    renderApp(backend, '/?view=record');

    expect(await screen.findByRole('region', { name: /Daily record/ })).toBeInTheDocument();
    expect(backend.connect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('form', { name: 'Sign in' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Sign out' })).not.toBeInTheDocument();
    expect(window.location.search).toBe('?view=record');
  });

  it('asks for a login as soon as that backend starts requiring one', async () => {
    const user = userEvent.setup();
    const backend = fakeBackend({ auth: false });
    renderApp(backend);
    await platformShown();

    backend.state.intercept = () => apiError(401, 'UNAUTHENTICATED');
    await user.click(screen.getByRole('link', { name: 'Daily record' }));
    expect(await loginForm()).toBeInTheDocument();
  });
});
