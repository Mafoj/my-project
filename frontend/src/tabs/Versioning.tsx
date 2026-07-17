import { CHANGELOG } from '../lib/changelog';

export function Versioning() {
  return (
    <div className="page">
      {CHANGELOG.map((entry) => (
        <div key={entry.version} className="card version-card">
          <div className="version-hdr">
            <span className="version-badge">v{entry.version}</span>
            <span className="version-date">{entry.date}</span>
          </div>
          <ul className="version-list">
            {entry.changes.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}
