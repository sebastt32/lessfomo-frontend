import { describe, expect, it } from 'vitest';
import { describeMilestone, isEventMilestone } from './milestones';

describe('describeMilestone', () => {
  it.each([
    ['0m', 'At creation'],
    ['1m', '1 min'],
    ['5m', '5 min'],
    ['30m', '30 min'],
    ['1h', '1 h'],
    ['24h', '24 h'],
    ['d2', 'Day 2'],
    ['d7', 'Day 7'],
    ['w2', 'Week 2'],
    ['w12', 'Week 12'],
    ['event:migrated', 'Migrated to PumpSwap'],
    ['event:new-peak', 'New peak'],
    ['event:holders-100', '100 holders'],
    ['event:holders-1000', '1,000 holders'],
    ['something-new', 'something-new'],
  ])('%s -> %s', (milestone, label) => {
    expect(describeMilestone(milestone)).toBe(label);
  });

  it('tells event milestones apart from scheduled ones', () => {
    expect(isEventMilestone('event:new-peak')).toBe(true);
    expect(isEventMilestone('5m')).toBe(false);
  });
});
