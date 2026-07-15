import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getAdminPoll, closePoll, submitVote, previewPoll } from '../lib/api';
import useWebSocket from '../hooks/useWebSocket';
import ResultsDisplay from '../components/ResultsDisplay';
import QRCode from 'react-qr-code';
import { useTranslation } from '../i18n/I18nContext';

export default function AdminPage() {
  const { t } = useTranslation();
  const { adminId } = useParams();

  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [isClosing, setIsClosing] = useState(false);
  const [closedResults, setClosedResults] = useState(null);
  const [isAddingVotes, setIsAddingVotes] = useState(false);
  const [copiedVoterLink, setCopiedVoterLink] = useState(false);
  const [preview, setPreview] = useState(null);

  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  const handlePressStart = useCallback(() => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(async () => {
      didLongPress.current = true;
      try {
        const data = await previewPoll(adminId);
        setPreview(data);
      } catch { /* ignore */ }
    }, 800);
  }, [adminId]);

  const handlePressEnd = useCallback(() => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }, []);

  const pollId = poll?.pollId || poll?.id;
  const { voteCount, results: wsResults, isConnected } = useWebSocket(pollId);

  // Fetch admin poll data
  useEffect(() => {
    async function fetchAdmin() {
      setLoading(true);
      setError('');
      try {
        const data = await getAdminPoll(adminId);
        setPoll(data);
        if (data.results) {
          setClosedResults(data.results);
        }
      } catch (err) {
        setError(err.message || 'Failed to load admin data');
      } finally {
        setLoading(false);
      }
    }
    fetchAdmin();
  }, [adminId]);

  // Close poll
  async function handleClosePoll() {
    const confirmed = window.confirm(
      'Are you sure you want to close voting and reveal results? This cannot be undone.'
    );
    if (!confirmed) return;

    setIsClosing(true);
    try {
      const result = await closePoll(adminId);
      setClosedResults(result.results || result);
      setPoll((prev) => ({ ...prev, status: 'closed', closed: true }));
    } catch (err) {
      alert('Failed to close poll: ' + (err.message || 'Unknown error'));
    } finally {
      setIsClosing(false);
    }
  }

  // Add random test votes
  async function handleAddTestVotes() {
    if (!pollId || isAddingVotes) return;
    setIsAddingVotes(true);
    try {
      const ids = movies.map((m) => m.imdbID);
      for (let v = 0; v < 10; v++) {
        const ranking = [...ids];
        for (let i = ranking.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [ranking[i], ranking[j]] = [ranking[j], ranking[i]];
        }
        await submitVote(pollId, ranking);
      }
    } catch (err) {
      alert('Failed to add test votes: ' + err.message);
    } finally {
      setIsAddingVotes(false);
    }
  }

  const isClosed = poll?.status === 'closed' || poll?.closed;
  const resultsData = closedResults || wsResults || poll?.results;
  const movies = poll?.movies || [];
  const displayVotes = voteCount || poll?.voteCount || 0;

  // Loading
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner spinner-lg" />
        <span>Loading admin panel...</span>
      </div>
    );
  }

  // Error
  if (error) {
    return (
      <div className="error-state">
        <div className="error-state-icon">🔒</div>
        <h3>Access Denied</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  const createdAt = poll?.createdAt ? new Date(poll.createdAt).toLocaleString() : null;

  return (
    <div className="admin-page">
      <h1 className="page-title">{t('admin.title')}</h1>
      <p className="page-description">
        {t('admin.description')}
      </p>

      {/* Voter Link */}
      {pollId && (() => {
        const voterUrl = `${window.location.origin}/vote/${pollId}`;
        return (
          <div className="link-card" style={{ marginBottom: '1.5rem' }}>
            <div className="link-card-label">{'🗳️ ' + t('admin.shareLink')}</div>
            <div className="link-card-row">
              <div className="link-card-url">{voterUrl}</div>
              <button
                className="btn btn-sm btn-primary link-card-copy"
                onClick={async () => {
                  try { await navigator.clipboard.writeText(voterUrl); }
                  catch {
                    const ta = document.createElement('textarea');
                    ta.value = voterUrl;
                    document.body.appendChild(ta);
                    ta.select();
                    document.execCommand('copy');
                    document.body.removeChild(ta);
                  }
                  setCopiedVoterLink(true);
                  setTimeout(() => setCopiedVoterLink(false), 2000);
                }}
              >
                {copiedVoterLink ? <span className="copy-feedback">{t('admin.copied')}</span> : t('admin.copy')}
              </button>
              {typeof navigator.share === 'function' && (
                <button
                  className="btn btn-sm btn-accent"
                  onClick={() => navigator.share({ title: t('admin.shareMessage'), url: voterUrl })}
                >
                  {'📤 ' + t('admin.share')}
                </button>
              )}
            </div>
            <div className="qr-section">
              <QRCode
                value={voterUrl}
                size={160}
                bgColor="#0c1220"
                fgColor="#a78bfa"
                level="M"
              />
              <div className="qr-label">{t('admin.scanToVote')}</div>
            </div>
          </div>
        );
      })()}

      {/* Stats */}
      <div className="admin-stats">
        <div className="admin-stat-card">
          <div className="admin-stat-value">{movies.length}</div>
          <div className="admin-stat-label">{t('admin.movies')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
            <div className={`ws-dot ${isConnected ? '' : 'disconnected'}`} style={{ width: '6px', height: '6px' }} />
            {displayVotes}
          </div>
          <div className="admin-stat-label">{t('admin.votes')}</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-value admin-status-badge">
            {isClosed ? (
              <span className="badge badge-danger">{t('admin.statusClosed')}</span>
            ) : (
              <span className="badge badge-success">{t('admin.statusOpen')}</span>
            )}
          </div>
          <div className="admin-stat-label">{t('admin.status')}</div>
        </div>
        {createdAt && (
          <div className="admin-stat-card">
            <div className="admin-stat-value" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{createdAt}</div>
            <div className="admin-stat-label">{t('admin.created')}</div>
          </div>
        )}
      </div>

      {/* Movies List */}
      <div className="section-title">{'🎬 ' + t('admin.moviesInPoll')}</div>
      <div className="admin-movies-list">
        {movies.map((movie, i) => {
          const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
          return (
            <div key={movie.imdbID || i} className="admin-movie-item">
              {poster ? (
                <img src={poster} alt={movie.Title} className="admin-movie-poster" />
              ) : (
                <div className="admin-movie-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>🎬</div>
              )}
              <div>
                <div style={{ fontWeight: 600 }}>{movie.Title}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{movie.Year}{movie.Genre && movie.Genre !== 'N/A' ? ` · ${movie.Genre}` : ''}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Close Poll / Results */}
      {!isClosed && !resultsData && (
        <div className="admin-close-section">
          <p>{t('admin.closeDescription')}</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {import.meta.env.DEV && (
              <button
                className="btn btn-lg btn-ghost"
                onClick={handleAddTestVotes}
                disabled={isAddingVotes}
                style={{ opacity: 0.85 }}
              >
                {isAddingVotes ? '⏳ ' + t('admin.testVotesLoading') : '🧪 ' + t('admin.testVotes')}
              </button>
            )}
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                className="btn btn-lg btn-danger"
                onClick={() => { if (!didLongPress.current) handleClosePoll(); }}
                onPointerDown={handlePressStart}
                onPointerUp={handlePressEnd}
                onPointerLeave={handlePressEnd}
                disabled={isClosing}
              >
                {isClosing ? (
                  <>
                    <span className="spinner" style={{ borderTopColor: 'white' }} />
                    {t('admin.closing')}
                  </>
                ) : (
                  <>{'🏁 ' + t('admin.closePoll')}</>
                )}
              </button>
              {preview && (
                <div className="preview-popup" onClick={() => setPreview(null)}>
                  <div className="preview-title">🔮 {t('admin.previewTitle')}</div>
                  <div className="preview-subtitle">{t('admin.previewSubtitle', { count: preview.totalVotes })}</div>
                  {preview.top3.map((entry, i) => (
                    <div key={entry.imdbID} className="preview-row">
                      <span className="preview-rank">{['🥇', '🥈', '🥉'][i]}</span>
                      <span className="preview-name">{entry.title}</span>
                      <span className="preview-votes">{entry.votes}</span>
                    </div>
                  ))}
                  <div className="preview-hint">{t('admin.previewHint')}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      {resultsData && (
        <div style={{ marginTop: '1.5rem' }}>
          <div className="section-title">{'🏆 ' + t('admin.results')}</div>
          <ResultsDisplay results={resultsData} movies={movies} />
        </div>
      )}
    </div>
  );
}
