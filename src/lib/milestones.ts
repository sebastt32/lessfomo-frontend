const countFormatter = new Intl.NumberFormat('en-US');

/** Human label for a snapshot milestone ("0m" -> "Al crearse", "d3" -> "Día 3", ...). Unknown values pass through. */
export function describeMilestone(milestone: string): string {
  if (milestone === '0m') return 'Al crearse';
  if (milestone === 'event:migrated') return 'Migró a PumpSwap';
  if (milestone === 'event:new-peak') return 'Nuevo pico';

  const holders = /^event:holders-(\d+)$/.exec(milestone);
  if (holders) return `${countFormatter.format(Number(holders[1]))} holders`;

  const scheduled = /^(\d+)(m|h)$/.exec(milestone);
  if (scheduled) return `${scheduled[1]} ${scheduled[2] === 'm' ? 'min' : 'h'}`;

  const calendar = /^(d|w)(\d+)$/.exec(milestone);
  if (calendar) return `${calendar[1] === 'd' ? 'Día' : 'Semana'} ${calendar[2]}`;

  return milestone;
}

/** Event milestones (migration, new peak, holder counts) happen when something changes, not on a schedule. */
export function isEventMilestone(milestone: string): boolean {
  return milestone.startsWith('event:');
}
