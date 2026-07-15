import { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/I18nContext';

function na(val) {
  return val && val !== 'N/A' ? val : null;
}

function RatingBadge({ source, value }) {
  let icon = '⭐';
  let label = source;
  if (source === 'Internet Movie Database') { icon = '⭐'; label = 'IMDb'; }
  else if (source === 'Rotten Tomatoes') { icon = '🍅'; label = 'Rotten Tomatoes'; }
  else if (source === 'Metacritic') { icon = '🟢'; label = 'Metacritic'; }

  return (
    <div className="modal-rating">
      <span className="modal-rating-icon">{icon}</span>
      <div>
        <div className="modal-rating-value">{value}</div>
        <div className="modal-rating-source">{label}</div>
      </div>
    </div>
  );
}

export default function MovieModal({ movie, onClose }) {
  const { t } = useTranslation();
  const overlayRef = useRef(null);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    function handlePopState() {
      onClose();
    }

    // Push a history entry so the back button closes the modal
    history.pushState({ modal: true }, '');
    document.addEventListener('keydown', handleKey);
    window.addEventListener('popstate', handlePopState);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('popstate', handlePopState);
      document.body.style.overflow = '';
      // Pop the modal history entry if it's still there
      if (history.state?.modal) history.back();
    };
  }, [onClose]);

  if (!movie) return null;

  const poster = na(movie.Poster);
  const ratings = movie.Ratings?.filter(r => na(r.Value)) || [];

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="modal-hero">
          {poster && <img src={poster} alt={movie.Title} className="modal-poster" />}
          <div className="modal-hero-info">
            <h2 className="modal-title">{movie.Title}</h2>
            <div className="modal-meta-row">
              {na(movie.Year) && <span className="modal-meta-chip">{movie.Year}</span>}
              {na(movie.Rated) && <span className="modal-meta-chip">{movie.Rated}</span>}
              {na(movie.Runtime) && <span className="modal-meta-chip">{movie.Runtime}</span>}
            </div>
            {na(movie.Genre) && <div className="modal-genre">{movie.Genre}</div>}

            {/* Ratings */}
            {ratings.length > 0 && (
              <div className="modal-ratings">
                {ratings.map((r, i) => <RatingBadge key={i} source={r.Source} value={r.Value} />)}
              </div>
            )}
          </div>
        </div>

        {/* Plot */}
        {na(movie.Plot) && (
          <div className="modal-section">
            <div className="modal-section-title">{t('modal.plot')}</div>
            <p className="modal-plot">{movie.Plot}</p>
          </div>
        )}

        {/* Details grid */}
        <div className="modal-details">
          {na(movie.Director) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.director')}</span>
              <span className="modal-detail-value">{movie.Director}</span>
            </div>
          )}
          {na(movie.Writer) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.writer')}</span>
              <span className="modal-detail-value">{movie.Writer}</span>
            </div>
          )}
          {na(movie.Actors) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.cast')}</span>
              <span className="modal-detail-value">{movie.Actors}</span>
            </div>
          )}
          {na(movie.Language) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.language')}</span>
              <span className="modal-detail-value">{movie.Language}</span>
            </div>
          )}
          {na(movie.Country) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.country')}</span>
              <span className="modal-detail-value">{movie.Country}</span>
            </div>
          )}
          {na(movie.Released) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.released')}</span>
              <span className="modal-detail-value">{movie.Released}</span>
            </div>
          )}
          {na(movie.BoxOffice) && (
            <div className="modal-detail">
              <span className="modal-detail-label">{t('modal.boxOffice')}</span>
              <span className="modal-detail-value">{movie.BoxOffice}</span>
            </div>
          )}
        </div>

        {/* Awards */}
        {na(movie.Awards) && (
          <div className="modal-awards">
            <span className="modal-awards-icon">🏆</span>
            <span>{movie.Awards}</span>
          </div>
        )}

        {/* IMDb link */}
        {na(movie.imdbID) && (
          <div style={{ textAlign: 'center', marginTop: '1rem' }}>
            <a
              href={`https://www.imdb.com/title/${movie.imdbID}/`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-ghost"
            >
              {t('modal.viewOnImdb')}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
