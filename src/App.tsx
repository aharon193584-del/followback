import { useMemo, useState } from 'react';
import type { FollowSnapshot, SnapshotDiff } from './domain/types';
import { fansOnly, followersKnown, mutuals, notFollowingBack } from './domain/lists';
import { diffSnapshots } from './domain/diff';
import { compareBlockers, compareWarnings, loadSnapshot, loadSnapshotFromZip } from './ui/loadSnapshot';
import type { LoadedSnapshot } from './ui/loadSnapshot';
import { AccountList } from './ui/AccountList';
import { AnalyticsPanel } from './ui/AnalyticsPanel';
import { FileLoader } from './ui/FileLoader';
import { DiffPanel } from './ui/DiffPanel';
import './app.css';

type TabId = 'notBack' | 'fans' | 'mutuals' | 'analytics' | 'changes';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'notBack', label: 'לא עוקבים אחריך' },
  { id: 'fans', label: 'העוקבים שלך' },
  { id: 'mutuals', label: 'הדדיים' },
  { id: 'analytics', label: 'אנליטיקות' },
];

const EMPTY_TEXT: Record<Exclude<TabId, 'analytics' | 'changes'>, string> = {
  notBack: 'כל מי שאתה עוקב אחריו עוקב אחריך בחזרה.',
  fans: 'אין עוקבים שאתה לא עוקב אחריהם.',
  mutuals: 'אין חשבונות הדדיים.',
};

function App() {
  const [snapshot, setSnapshot] = useState<FollowSnapshot | null>(null);
  const [previous, setPrevious] = useState<FollowSnapshot | null>(null);
  const [tab, setTab] = useState<TabId>('notBack');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [compareBlocked, setCompareBlocked] = useState<string[]>([]);
  const [currentMeta, setCurrentMeta] = useState<LoadedSnapshot['meta']>({});

  const lists = useMemo(() => {
    if (!snapshot) return null;
    return {
      notBack: notFollowingBack(snapshot),
      fans: fansOnly(snapshot),
      mutuals: mutuals(snapshot),
    };
  }, [snapshot]);

  const diff: SnapshotDiff | null = useMemo(() => {
    if (!snapshot || !previous) return null;
    return diffSnapshots(previous, snapshot);
  }, [snapshot, previous]);

  async function runLoad(loader: () => Promise<LoadedSnapshot>, apply: (loaded: LoadedSnapshot) => void) {
    setLoading(true);
    setError(null);
    try {
      apply(await loader());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הקבצים.');
    } finally {
      setLoading(false);
    }
  }

  function applyCurrent(loaded: LoadedSnapshot) {
    setSnapshot(loaded.snapshot);
    setCurrentMeta(loaded.meta);
    setWarnings(loaded.warnings);
    setCompareBlocked([]);
    setPrevious(null);
    setTab('notBack');
  }

  function applyPrevious(loaded: LoadedSnapshot) {
    const blockers = [...compareBlockers(currentMeta, loaded.meta)];
    if (!followersKnown(loaded.snapshot) || (snapshot && !followersKnown(snapshot))) {
      blockers.push('ברשימת העוקבים של אחד הייצואים חסרים נתונים; ההשוואה נחסמה עד שיש שני ייצואים מלאים.');
    }
    if (blockers.length > 0) {
      setCompareBlocked(blockers);
      setPrevious(null);
      return;
    }
    setCompareBlocked([]);
    setPrevious(loaded.snapshot);
    setWarnings([...loaded.warnings, ...compareWarnings(currentMeta, loaded.meta)]);
    setTab('changes');
  }

  function loadCurrentZip(zip: File) {
    return runLoad(() => loadSnapshotFromZip(zip), applyCurrent);
  }

  function loadCurrentPair(following: File, followers: File) {
    return runLoad(() => loadSnapshot(following, followers), applyCurrent);
  }

  function loadPreviousZip(zip: File) {
    return runLoad(() => loadSnapshotFromZip(zip), applyPrevious);
  }

  function loadPreviousPair(following: File, followers: File) {
    return runLoad(() => loadSnapshot(following, followers), applyPrevious);
  }

  const tabs = diff ? [...TABS, { id: 'changes' as TabId, label: 'שינויים' }] : TABS;

  return (
    <main className="app">
      <header>
        <h1>מי לא עוקב אחריך</h1>
        <p className="subtitle">ניתוח קבצי הייצוא הרשמי של אינסטגרם - פרטי, בלי התחברות</p>
      </header>

      <FileLoader
        title="טען את קבצי הייצוא"
        onLoadZip={loadCurrentZip}
        onLoadPair={loadCurrentPair}
        error={error}
        loading={loading}
      />

      {warnings.length > 0 && (
        <div className="warnings" role="status">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      {compareBlocked.length > 0 && (
        <div className="error-block" role="alert">
          {compareBlocked.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      )}

      {snapshot && !followersKnown(snapshot) && (
        <section className="panel" role="status">
          <p>
            קובץ העוקבים (followers.html) חסר בייצוא, ולכן לא ניתן לאשר שהנתונים
            מלאים. הרשימות והאנליטיקות לא מוצגות עד שנטען ייצוא שכולל את רשימת
            העוקבים.
          </p>
        </section>
      )}

      {snapshot && followersKnown(snapshot) && lists && (
        <>
          <nav className="tabs" role="tablist">
            {tabs.map(({ id, label }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                className={tab === id ? 'tab active' : 'tab'}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </nav>
          <section className="panel" role="tabpanel">
            {tab === 'analytics' && <AnalyticsPanel snapshot={snapshot} />}
            {tab === 'changes' && diff && <DiffPanel diff={diff} />}
            {tab !== 'analytics' && tab !== 'changes' && (
              <AccountList accounts={lists[tab]} emptyText={EMPTY_TEXT[tab]} />
            )}
          </section>
          {!comparing && !previous && compareBlocked.length === 0 && (
            <button type="button" className="link-button" onClick={() => setComparing(true)}>
              יש לך ייצוא קודם? השווה כדי לראות שינויים ברשימות
            </button>
          )}
          {comparing && !previous && (
            <FileLoader
              title="טען את הייצוא הקודם להשוואה"
              onLoadZip={loadPreviousZip}
              onLoadPair={loadPreviousPair}
              error={error}
              loading={loading}
            />
          )}
        </>
      )}

      <footer>
        <p>
          הנתונים מעובדים בדפדפן בלבד ולא נשלחים החוצה. פעולות בחשבון (כמו
          הסרת מעקב) מתבצעות באינסטגרם עצמו דרך קישור הפרופיל.
        </p>
      </footer>
    </main>
  );
}

export default App;
