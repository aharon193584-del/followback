import type { SnapshotDiff } from '../domain/types';
import { AccountList } from './AccountList';

interface Props {
  diff: SnapshotDiff;
}

/** Membership differences between the two compared exports. */
export function DiffPanel({ diff }: Props) {
  const sections: Array<{ title: string; accounts: SnapshotDiff['newFollowing']; empty: string }> = [
    { title: 'לא נמצאו יותר ברשימת העוקבים', accounts: diff.lostFollowers, empty: 'אין הבדל ברשימת העוקבים.' },
    { title: 'נוספו לרשימת העוקבים', accounts: diff.newFollowers, empty: 'אין עוקבים חדשים ברשימה.' },
    { title: 'לא נמצאו יותר ברשימת החשבונות שאתה עוקב אחריהם', accounts: diff.unfollowed, empty: 'אין הבדל ברשימת המעקב.' },
    { title: 'נוספו לרשימת החשבונות שאתה עוקב אחריהם', accounts: diff.newFollowing, empty: 'אין חשבונות חדשים ברשימת המעקב.' },
  ];
  return (
    <div>
      <p className="hint">
        ההשוואה מציגה רק חשבונות שנמצאים ברשימה אחת ולא בשנייה. מהייצוא עצמו לא
        ניתן לדעת מדוע חשבון ירד מהרשימה (למשל עוקב שהוסר או מי שהפסיק לעקוב
        מיוזמתו), ולא ניתן לוודא שהקבצים של אותו חשבון אלא לפי שמות הקבצים.
      </p>
      {sections.map(({ title, accounts, empty }) => (
        <section key={title}>
          <h3>{title} ({accounts.length})</h3>
          <AccountList accounts={accounts} emptyText={empty} />
        </section>
      ))}
    </div>
  );
}
