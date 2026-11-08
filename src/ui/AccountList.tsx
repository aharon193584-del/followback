import type { AccountEntry } from '../domain/types';

interface Props {
  accounts: AccountEntry[];
  emptyText: string;
}

/** Scrollable list of accounts; each row links out to the Instagram profile. */
export function AccountList({ accounts, emptyText }: Props) {
  if (accounts.length === 0) return <p className="empty">{emptyText}</p>;
  return (
    <ul className="account-list">
      {accounts.map((account) => (
        <li key={account.username.toLowerCase()}>
          <span className="username" dir="ltr">@{account.username}</span>
          <a href={account.profileUrl} target="_blank" rel="noopener noreferrer">
            פתח פרופיל
          </a>
        </li>
      ))}
    </ul>
  );
}
