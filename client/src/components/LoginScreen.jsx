export default function LoginScreen({ onLogin, authError }) {
  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">Bookmarks</h1>
        <p className="login-subtitle">
          Connect your Twitter account to see all your saved tweets, automatically categorized.
        </p>

        <div className="login-features">
          <div className="feature"><span>5-column grid</span></div>
          <div className="feature"><span>Auto-categorized</span></div>
          <div className="feature"><span>Search & filter</span></div>
          <div className="feature"><span>Always in sync</span></div>
        </div>

        {authError && (
          <div className="auth-error">
            {authError}
            {authError.includes('credentials') && <span> — See the setup instructions.</span>}
          </div>
        )}

        <button className="login-btn" onClick={onLogin}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
          </svg>
          Connect with X
        </button>

        <p className="login-note">
          Requires a Twitter Developer account.{' '}
          <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer">
            Create one here
          </a>
        </p>
      </div>
    </div>
  );
}
