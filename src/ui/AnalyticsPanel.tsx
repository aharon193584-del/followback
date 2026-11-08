import { analyze } from '../domain/analytics';
import type { FollowSnapshot } from '../domain/types';

interface Props {
  snapshot: FollowSnapshot;
}

const percent = (ratio: number) => `${Math.round(ratio * 100)}%`;

/** Summary cards for one snapshot. */
export function AnalyticsPanel({ snapshot }: Props) {
  const stats = analyze(snapshot);
  const cards: Array<[string, string | number]> = [
    ['עוקב אחריהם', stats.followingCount],
    ['עוקבים אותך', stats.followersCount],
    ['לא עוקבים אחריך', stats.notFollowingBackCount],
    ['עוקבים שלא עוקב אחריהם', stats.fansOnlyCount],
    ['הדדיים', stats.mutualsCount],
    ['אחוז עוקבים חוזרים', percent(stats.followBackRatio)],
  ];
  return (
    <div className="analytics-grid">
      {cards.map(([label, value]) => (
        <div className="stat-card" key={label}>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
