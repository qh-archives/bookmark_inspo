export default function SyncButton({ onSync, syncing, syncMsg }) {
  return (
    <div className="sync-wrapper">
      {syncMsg && <span className="sync-msg">{syncMsg}</span>}
      <button
        className={`sync-btn ${syncing ? 'syncing' : ''}`}
        onClick={onSync}
        disabled={syncing}
        title="Sync bookmarks from Twitter"
      >
        <span className="sync-icon">↻</span>
        <span>Sync</span>
      </button>
    </div>
  );
}
