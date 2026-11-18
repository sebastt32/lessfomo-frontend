import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GUIDE_STORAGE_KEY, hasSeenGuide, markGuideSeen } from '../../lib/welcomeGuide';
import { WelcomeGuide } from './WelcomeGuide';

afterEach(() => window.localStorage.clear());

describe('WelcomeGuide', () => {
  it('walks through four short steps with next and previous, and closes with "Empezar"', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WelcomeGuide onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Bienvenido a lessfomo' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveTextContent('Paso 1 de 4');
    expect(screen.queryByRole('button', { name: 'Anterior' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('dialog', { name: 'En vivo' })).toHaveTextContent('Paso 2 de 4');
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    expect(screen.getByRole('dialog', { name: 'Registro diario' })).toHaveTextContent('Paso 3 de 4');
    await user.click(screen.getByRole('button', { name: 'Anterior' }));
    expect(screen.getByRole('dialog', { name: 'En vivo' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));
    await user.click(screen.getByRole('button', { name: 'Siguiente' }));

    const last = screen.getByRole('dialog', { name: 'Los signos de pregunta' });
    expect(last).toHaveTextContent('Paso 4 de 4');
    expect(screen.queryByRole('button', { name: 'Siguiente' })).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Empezar' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('can be skipped at any step, also with Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<WelcomeGuide onClose={onClose} />);
    await user.click(screen.getByRole('button', { name: 'Saltar guía' }));
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('keeps the keyboard focus inside the guide', async () => {
    const user = userEvent.setup();
    render(<WelcomeGuide onClose={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Saltar guía' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Saltar guía' })).toHaveFocus();
  });
});

describe('whether the guide was seen', () => {
  it('is remembered in this browser', () => {
    window.localStorage.clear();
    expect(hasSeenGuide()).toBe(false);
    markGuideSeen();
    expect(window.localStorage.getItem(GUIDE_STORAGE_KEY)).toBe('1');
    expect(hasSeenGuide()).toBe(true);
  });

  it('counts as seen when storage is blocked, so the guide never loops', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(hasSeenGuide()).toBe(true);
    spy.mockRestore();
    const setSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => markGuideSeen()).not.toThrow();
    setSpy.mockRestore();
  });
});
