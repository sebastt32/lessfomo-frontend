const countFormatter = new Intl.NumberFormat('en-US');

/** Human label for a snapshot milestone ("0m" -> "At creation", "d3" -> "Day 3", ...). Unknown values pass through. */
export function describeMilestone(milestone: string): string {
  if (milestone === '0m') return 'At creation';
  if (milestone === 'event:migrated') return 'Migrated to PumpSwap';
  if (milestone === 'event:new-peak') return 'New peak';

  const holders = /^event:holders-(\d+)$/.exec(milestone);
  if (holders) return `${countFormatter.format(Number(holders[1]))} holders`;

  const scheduled = /^(\d+)(m|h)$/.exec(milestone);
  if (scheduled) return `${scheduled[1]} ${scheduled[2] === 'm' ? 'min' : 'h'}`;

  const calendar = /^(d|w)(\d+)$/.exec(milestone);
  if (calendar) return `${calendar[1] === 'd' ? 'Day' : 'Week'} ${calendar[2]}`;

  return milestone;
}

/** Event milestones (migration, new peak, holder counts) happen when something changes, not on a schedule. */
export function isEventMilestone(milestone: string): boolean {
  return milestone.startsWith('event:');
}
