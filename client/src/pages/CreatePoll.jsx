import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchMovies, getMovieDetails, createPoll } from '../lib/api';
import { useTranslation } from '../i18n/I18nContext';

export default function CreatePoll() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Search state
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Selected movies (full details)
  const [selectedMovies, setSelectedMovies] = useState([]);

  // Creation state
  const [isCreating, setIsCreating] = useState(false);

  // Test dataset (dev mode only)
  const testDataRef = useRef(null);
  const [isLoadingTest, setIsLoadingTest] = useState(false);

  async function handleAddTestMovies() {
    setIsLoadingTest(true);
    try {
      if (!testDataRef.current) {
        const res = await fetch('/test-movies.json');
        testDataRef.current = await res.json();
      }
      const pool = testDataRef.current.filter(
        (m) => !selectedMovies.some((s) => s.imdbID === m.imdbID)
      );
      // Fisher-Yates pick 7
      const shuffled = [...pool];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setSelectedMovies((prev) => [...prev, ...shuffled.slice(0, 7)]);
    } catch (err) {
      alert('Failed to load test data: ' + err.message);
    } finally {
      setIsLoadingTest(false);
    }
  }

  // Debounce ref
  const debounceRef = useRef(null);

  // Debounced search
  const performSearch = useCallback(async (q) => {
    const trimmed = q.trim();
    if (!trimmed) {
      setSearchResults([]);
      setSearchError('');
      return;
    }

    setIsSearching(true);
    setSearchError('');

    try {
      // Detect IMDb ID lookup (starts with 'tt')
      if (/^tt\d+/i.test(trimmed)) {
        const movie = await getMovieDetails(trimmed);
        setSearchResults(movie ? [movie] : []);
      } else {
        const data = await searchMovies(trimmed);
        setSearchResults(data.Search || data.results || data || []);
      }
    } catch (err) {
      setSearchError(err.message || 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  // Add movie
  async function handleAddMovie(movie) {
    const id = movie.imdbID;
    if (selectedMovies.some((m) => m.imdbID === id)) return;

    try {
      // Fetch full details if we only have search result data
      let fullMovie = movie;
      if (!movie.Plot) {
        fullMovie = await getMovieDetails(id);
      }
      setSelectedMovies((prev) => [...prev, fullMovie]);
    } catch {
      // Fallback to basic data
      setSelectedMovies((prev) => [...prev, movie]);
    }
  }

  // Remove movie
  function handleRemoveMovie(imdbID) {
    setSelectedMovies((prev) => prev.filter((m) => m.imdbID !== imdbID));
  }

  // Create poll
  async function handleCreatePoll() {
    if (selectedMovies.length < 2 || isCreating) return;

    setIsCreating(true);
    try {
      const result = await createPoll(selectedMovies);
      navigate(`/admin/${result.adminId}`);
    } catch (err) {
      alert('Failed to create poll: ' + (err.message || 'Unknown error'));
    } finally {
      setIsCreating(false);
    }
  }

  const selectedIds = new Set(selectedMovies.map((m) => m.imdbID));

  // ── Search & Select ──
  return (
    <div className="create-poll">
      <h1 className="page-title">{t('create.title')}</h1>
      <p className="page-description">
        {t('create.description')}
      </p>

      {import.meta.env.DEV && (
        <button
          className="btn btn-sm btn-ghost"
          style={{ marginBottom: '1rem', opacity: 0.8 }}
          onClick={handleAddTestMovies}
          disabled={isLoadingTest}
        >
          {isLoadingTest ? '⏳ ' + t('create.testMoviesLoading') : '🧪 ' + t('create.testMovies')}
        </button>
      )}

      {/* Search */}
      <div className="search-section">
        <div className="search-input-wrap">
          <span className="input-icon">🔍</span>
          <input
            type="text"
            className="input input-with-icon"
            placeholder={t('create.searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {isSearching && (
            <div className="input-spinner">
              <div className="spinner" />
            </div>
          )}
        </div>

        {searchError && (
          <div style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: '0.75rem' }}>
            {searchError}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map((movie) => {
              const isSelected = selectedIds.has(movie.imdbID);
              const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
              const imdbRating = movie.imdbRating && movie.imdbRating !== 'N/A' ? movie.imdbRating : null;
              const ratingClass = imdbRating
                ? parseFloat(imdbRating) >= 7 ? 'rating-good' : parseFloat(imdbRating) >= 5 ? 'rating-mid' : 'rating-bad'
                : '';

              return (
                <div
                  key={movie.imdbID}
                  className={`search-result-card ${isSelected ? 'already-selected' : ''}`}
                  onClick={() => !isSelected && handleAddMovie(movie)}
                >
                  {poster ? (
                    <img src={poster} alt={movie.Title} className="search-result-poster" />
                  ) : (
                    <div className="search-result-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎬</div>
                  )}
                  <div className="search-result-info">
                    <div className="search-result-title">{movie.Title}</div>
                    <div className="search-result-meta">
                      <span>{movie.Year}</span>
                      {movie.Type && <span>· {movie.Type}</span>}
                      {movie.Genre && movie.Genre !== 'N/A' && <span>· {movie.Genre}</span>}
                    </div>
                    {imdbRating && (
                      <div className={`search-result-rating ${ratingClass}`}>
                        ⭐ {imdbRating}
                      </div>
                    )}
                    {isSelected && (
                      <span className="badge badge-success" style={{ marginTop: '0.2rem' }}>✓ {t('create.added')}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {query.trim() && !isSearching && searchResults.length === 0 && !searchError && (
          <div className="empty-state">
            <div className="empty-state-icon">🎬</div>
            <p>{t('create.noResults')}</p>
          </div>
        )}
      </div>

      {/* Selected Movies */}
      {selectedMovies.length > 0 && (
        <div className="selected-section">
          <div className="selected-header">
            <span className="section-title">{t('create.selectedMovies')}</span>
            <span className="badge badge-primary">{t('create.movieCount', { count: selectedMovies.length })}</span>
          </div>
          <div className="selected-movies">
            {selectedMovies.map((movie) => {
              const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
              return (
                <div key={movie.imdbID} className="selected-chip">
                  {poster ? (
                    <img src={poster} alt={movie.Title} className="selected-chip-poster" />
                  ) : (
                    <span style={{ fontSize: '1rem' }}>🎬</span>
                  )}
                  <span>{movie.Title} ({movie.Year})</span>
                  <button className="selected-chip-remove" onClick={() => handleRemoveMovie(movie.imdbID)}>✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Button */}
      <div className="create-actions">
        <button
          className="btn btn-lg btn-primary"
          disabled={selectedMovies.length < 2 || isCreating}
          onClick={handleCreatePoll}
          style={{ flex: 1 }}
        >
          {isCreating ? (
            <>
              <span className="spinner" style={{ borderTopColor: 'white' }} />
              {t('create.creating')}
            </>
          ) : (
            <>
              {'🗳️ ' + (selectedMovies.length >= 2 ? t('create.createPollWithCount', { count: selectedMovies.length }) : t('create.createPoll'))}
            </>
          )}
        </button>
      </div>
      {selectedMovies.length < 2 && selectedMovies.length > 0 && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', marginTop: '0.5rem' }}>
          {t('create.addMore', { count: 2 - selectedMovies.length })}
        </p>
      )}
    </div>
  );
}
