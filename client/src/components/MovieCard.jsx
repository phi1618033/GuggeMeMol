export default function MovieCard({ movie, rank, compact, onRemove }) {
  if (!movie) return null;

  const imdbRating = movie.imdbRating && movie.imdbRating !== 'N/A'
    ? parseFloat(movie.imdbRating) : null;

  const rtRating = movie.Ratings?.find(r => r.Source === 'Rotten Tomatoes')?.Value;

  const ratingClass = imdbRating !== null
    ? imdbRating >= 7 ? 'rating-good' : imdbRating >= 5 ? 'rating-mid' : 'rating-bad'
    : '';

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;

  if (compact) {
    return (
      <div className="movie-card movie-card-compact">
        {poster ? (
          <img src={poster} alt={movie.Title} className="movie-card-poster movie-card-poster-compact" />
        ) : (
          <div className="movie-card-poster movie-card-poster-compact" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>🎬</div>
        )}
        <div className="movie-card-body">
          <div className="movie-card-title">{rank != null && <span style={{ color: 'var(--text-muted)', marginRight: '0.4rem' }}>#{rank}</span>}{movie.Title}</div>
          <div className="movie-card-year">{movie.Year}</div>
          {imdbRating !== null && (
            <div className="movie-card-ratings">
              <span className={`movie-card-rating ${ratingClass}`}>⭐ {movie.imdbRating}</span>
            </div>
          )}
        </div>
        {onRemove && (
          <button className="btn btn-icon btn-ghost" onClick={onRemove} title="Remove" style={{ alignSelf: 'flex-start' }}>✕</button>
        )}
      </div>
    );
  }

  return (
    <div className="movie-card">
      {poster ? (
        <img src={poster} alt={movie.Title} className="movie-card-poster movie-card-poster-full" />
      ) : (
        <div className="movie-card-poster movie-card-poster-full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>🎬</div>
      )}
      <div className="movie-card-body">
        <div className="movie-card-title">
          {rank != null && <span style={{ color: 'var(--accent-light)', marginRight: '0.4rem' }}>#{rank}</span>}
          {movie.Title}
        </div>
        <div className="movie-card-year">{movie.Year}{movie.Rated && movie.Rated !== 'N/A' ? ` · ${movie.Rated}` : ''}</div>
        {movie.Genre && movie.Genre !== 'N/A' && <div className="movie-card-genre">{movie.Genre}</div>}
        {movie.Runtime && movie.Runtime !== 'N/A' && (
          <div className="movie-card-detail">🕐 {movie.Runtime}</div>
        )}
        {movie.Director && movie.Director !== 'N/A' && (
          <div className="movie-card-detail"><strong>Director:</strong> {movie.Director}</div>
        )}
        {movie.Actors && movie.Actors !== 'N/A' && (
          <div className="movie-card-detail"><strong>Cast:</strong> {movie.Actors}</div>
        )}
        {movie.Plot && movie.Plot !== 'N/A' && (
          <p className="movie-card-plot">{movie.Plot}</p>
        )}
        <div className="movie-card-ratings">
          {imdbRating !== null && (
            <span className={`movie-card-rating ${ratingClass}`}>⭐ {movie.imdbRating}/10</span>
          )}
          {rtRating && (
            <span className="movie-card-rating">🍅 {rtRating}</span>
          )}
        </div>
      </div>
      {onRemove && (
        <button className="btn btn-icon btn-ghost" onClick={onRemove} title="Remove" style={{ alignSelf: 'flex-start' }}>✕</button>
      )}
    </div>
  );
}
