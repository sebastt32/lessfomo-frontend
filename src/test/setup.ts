import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetCharts } from './lightweightChartsFake';
import { markGuideSeen } from '../lib/welcomeGuide';

// jsdom has no canvas: every test gets the recording fake instead of the real chart library.
vi.mock('lightweight-charts', () => import('./lightweightChartsFake'));

// The first-visit guide would cover every page test; tests of the guide clear this mark themselves.
beforeEach(() => {
  markGuideSeen();
});

afterEach(() => {
  cleanup();
  resetCharts();
});
