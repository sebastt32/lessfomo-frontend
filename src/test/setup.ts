import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetCharts } from './lightweightChartsFake';

// jsdom has no canvas: every test gets the recording fake instead of the real chart library.
vi.mock('lightweight-charts', () => import('./lightweightChartsFake'));

afterEach(() => {
  cleanup();
  resetCharts();
});
