import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { OfflineNotice } from './OfflineNotice';

describe('OfflineNotice', () => {
  it('explains that the backend is not answering and where it is expected', () => {
    render(<OfflineNotice apiUrl="http://localhost:3001" onRetry={() => {}} />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('The screener API is not answering');
    expect(alert).toHaveTextContent('http://localhost:3001');
    expect(alert).toHaveTextContent('VITE_API_URL');
  });

  it('retries when asked', async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    render(<OfflineNotice apiUrl="http://localhost:3001" onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
