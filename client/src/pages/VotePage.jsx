import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getPoll, submitVote } from '../lib/api';
import useWebSocket from '../hooks/useWebSocket';
import MovieRanker from '../components/MovieRanker';
import MovieModal from '../components/MovieModal';
import ResultsDisplay from '../components/ResultsDisplay';
import { useTranslation } from '../i18n/I18nContext';

export default function VotePage() {
  const { t } = useTranslation();
  const { pollId } = useParams();

  const [poll, setPoll] = useState(null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [hasVoted, setHasVoted] = useState(() => {
    return document.cookie.split('; ').some(c => c === `voted_${pollId}=1`);
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [modalMovie, setModalMovie] = useState(null);

  const { voteCount, results: wsResults, isConnected } = useWebSocket(pollId);

  // Fetch poll data
  useEffect(() => {
    async function fetchPoll() {
      setLoading(true);
      setError('');
      try {
        const data = await getPoll(pollId);
        setPoll(data);
        // Shuffle movie order to avoid position bias
        const shuffled = [...(data.movies || [])];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setMovies(shuffled);
      } catch (err) {
        setError(err.message || 'Failed to load poll');
      } finally {
        setLoading(false);
      }
    }
    fetchPoll();
  }, [pollId]);

  // Handle vote submission
  async function handleSubmit() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const ranking = movies.map((m) => m.imdbID);
      await submitVote(pollId, ranking);
      // Set cookie to prevent duplicate votes (90-day expiry)
      document.cookie = `voted_${pollId}=1; path=/; max-age=${60 * 60 * 24 * 90}; SameSite=Lax`;
      setHasVoted(true);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  }

  // Determine if we should show results
  const isClosed = poll?.status === 'closed' || poll?.closed;
  const showResults = isClosed || wsResults;
  const resultsData = wsResults || poll?.results;

  // Loading state
  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner spinner-lg" />
        <span>Loading poll...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="error-state">
        <div className="error-state-icon">😕</div>
        <h3>Oops!</h3>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  // Results view (poll closed)
  if (showResults && resultsData) {
    return (
      <div className="vote-page">
        <h1 className="page-title">{t('vote.resultsTitle')}</h1>
        <p className="page-description">{t('vote.resultsDescription')}</p>
        <ResultsDisplay results={resultsData} movies={poll?.movies || movies} />
      </div>
    );
  }

  // Thank-you state (voted but poll still open)
  if (hasVoted) {
    return (
      <div className="vote-page">
        <div className="vote-thankyou">
          <div className="vote-thankyou-icon">✅</div>
          <h2>{t('vote.thankYouTitle')}</h2>
          <p>{t('vote.thankYouMessage')}</p>
          <div className="vote-counter">
            <div className={`ws-dot ${isConnected ? '' : 'disconnected'}`} />
            <span>
              {t('vote.votesSoFar', { count: voteCount })}
            </span>
          </div>
        </div>

        {/* Skeleton placeholders while waiting */}
        <div style={{ opacity: 0.4, marginTop: '1rem' }}>
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
          <div className="skeleton skeleton-card" />
        </div>
      </div>
    );
  }

  // Voting view
  return (
    <>
      <div className="vote-page">
        <h1 className="page-title">{t('vote.title')}</h1>
        <p className="page-description">
          {t('vote.description')}
        </p>

        <div className="vote-instructions">
          <span className="vote-instructions-icon">💡</span>
          <div>
            <strong>{t('vote.howItWorks')}</strong>{' '}{t('vote.instructions')}
          </div>
        </div>

        <MovieRanker movies={movies} onReorder={setMovies} onMovieClick={setModalMovie} />

        {submitError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.82rem', textAlign: 'center', marginTop: '0.75rem' }}>
            {submitError}
          </div>
        )}

        <div className="vote-submit-section">
          <button
            className="btn btn-lg btn-accent"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner" style={{ borderTopColor: '#1a1a1a' }} />
                {t('vote.submitting')}
              </>
            ) : (
              <>🗳️ {t('vote.submit')}</>
            )}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '0.75rem' }}>
          <div className="vote-counter">
            <div className={`ws-dot ${isConnected ? '' : 'disconnected'}`} />
            <span>
              {t('vote.votesSoFar', { count: voteCount })}
            </span>
          </div>
        </div>
      </div>

      {modalMovie && <MovieModal movie={modalMovie} onClose={() => setModalMovie(null)} />}
    </>
  );
}
