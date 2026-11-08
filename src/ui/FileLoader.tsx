import { useRef, useState } from 'react';

interface Props {
  title: string;
  onLoadZip: (zip: File) => void;
  onLoadPair: (following: File, followers: File) => void;
  error: string | null;
  loading: boolean;
}

/** Hidden file input opened by a styled Hebrew button. */
function PickButton({
  id,
  label,
  file,
  accept,
  onPick,
}: {
  id: string;
  label: string;
  file: File | null;
  accept: string;
  onPick: (file: File | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        id={id}
        ref={inputRef}
        className="visually-hidden"
        type="file"
        accept={accept}
        aria-label={label}
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
      <button type="button" className="pick-button" onClick={() => inputRef.current?.click()}>
        בחר קובץ
      </button>
      <span className="pick-label">
        <span dir="ltr">{label}</span>
        {file && <span className="chosen" dir="ltr">{file.name}</span>}
      </span>
    </>
  );
}

/** Accepts either the whole export ZIP or the two HTML files it contains. */
export function FileLoader({ title, onLoadZip, onLoadPair, error, loading }: Props) {
  const [zip, setZip] = useState<File | null>(null);
  const [following, setFollowing] = useState<File | null>(null);
  const [followers, setFollowers] = useState<File | null>(null);
  const pairReady = following !== null && followers !== null;
  const canAnalyze = !loading && (zip !== null || pairReady);

  function analyze() {
    if (zip) onLoadZip(zip);
    else if (following && followers) onLoadPair(following, followers);
  }

  return (
    <section className="loader">
      <h2>{title}</h2>
      <p className="hint">
        מאינסטגרם: מרכז החשבונות ← המידע וההרשאות שלך ← ייצוא המידע ←{' '}
        <span dir="ltr">Followers and following</span>. אפשר לטעון את קובץ ה-ZIP של הייצוא,
        או את קבצי ה-following וה-followers מתוכו, בפורמט HTML או JSON.{' '}
        כל העיבוד מתבצע במכשיר שלך; הנתונים לא נשלחים לשום שרת.
      </p>
      <div className="file-row">
        <PickButton id="zip-input" label="קובץ ZIP של הייצוא" file={zip} accept=".zip,application/zip" onPick={setZip} />
        {!zip && <span className="hint">או:</span>}
      </div>
      {!zip && (
        <>
          <div className="file-row">
            <PickButton id="following-input" label="following.html / following.json" file={following} accept=".html,text/html,.json,application/json" onPick={setFollowing} />
          </div>
          <div className="file-row">
            <PickButton id="followers-input" label="followers.html / followers.json" file={followers} accept=".html,text/html,.json,application/json" onPick={setFollowers} />
          </div>
        </>
      )}
      {zip && (
        <button type="button" className="link-button" onClick={() => setZip(null)}>
          העדפת שני קבצים במקום ZIP? לחץ כאן
        </button>
      )}
      <button className="analyze" disabled={!canAnalyze} onClick={analyze}>
        {loading ? 'טוען…' : 'נתח'}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  );
}
