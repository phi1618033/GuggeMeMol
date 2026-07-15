import { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { useTranslation } from '../i18n/I18nContext';

export default function ResultsDisplay({ results, movies }) {
  const [openRounds, setOpenRounds] = useState(() => {
    // Open the last round by default
    if (results?.rounds?.length) {
      return new Set([results.rounds.length - 1]);
    }
    return new Set([0]);
  });
  const { t } = useTranslation();

  if (!results) return null;

  const { winner, rounds, totalVotes } = results;

  // Fire confetti once when winner is revealed
  const confettiFired = useRef(false);
  useEffect(() => {
    if (winner && !confettiFired.current) {
      confettiFired.current = true;
      const colors = ['#f59e0b', '#fbbf24', '#a78bfa', '#8b5cf6', '#ffffff'];
      const fire = (opts) => confetti({ ...opts, colors, disableForReducedMotion: true });
      fire({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setTimeout(() => fire({ particleCount: 50, spread: 100, origin: { y: 0.5, x: 0.3 } }), 250);
      setTimeout(() => fire({ particleCount: 50, spread: 100, origin: { y: 0.5, x: 0.7 } }), 400);
    }
  }, [winner]);

  const winnerMovie = movies?.find((m) => m.imdbID === winner || m.Title === winner) || null;
  const winnerTitle = winnerMovie?.Title || winner || 'Unknown';
  const winnerYear = winnerMovie?.Year || '';
  const winnerPoster = winnerMovie?.Poster && winnerMovie.Poster !== 'N/A' ? winnerMovie.Poster : null;

  function toggleRound(index) {
    setOpenRounds((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function getMovieTitle(id) {
    const movie = movies?.find((m) => m.imdbID === id || m.Title === id);
    return movie?.Title || id;
  }

  function getMaxVotes(roundVotes) {
    if (!roundVotes) return 1;
    const values = Object.values(roundVotes);
    return Math.max(...values, 1);
  }

  return (
    <div className="results-display">
      {/* Winner */}
      <div className="results-winner">
        <div className="results-winner-trophy">🏆</div>
        <div className="results-winner-label">{t('results.winner')}</div>
        <div className="results-winner-title">{winnerTitle}</div>
        {winnerYear && <div className="results-winner-year">{winnerYear}</div>}
        {winnerPoster && (
          <img src={winnerPoster} alt={winnerTitle} className="results-winner-poster" />
        )}
      </div>

      {/* Total Votes */}
      {totalVotes !== undefined && (
        <div className="results-total-votes">
          {t('results.totalVotes')} <strong>{totalVotes}</strong>
        </div>
      )}

      {/* Rounds */}
      {rounds && rounds.length > 0 && (
        <div>
          <div className="section-title" style={{ marginBottom: '0.75rem' }}>
            {'📊 ' + t('results.eliminationRounds')}
          </div>
          <div className="results-rounds">
            {rounds.map((round, roundIndex) => {
              const isOpen = openRounds.has(roundIndex);
              const eliminated = round.eliminated;
              const votes = round.counts || round.votes || round.tally || {};
              const maxVotes = getMaxVotes(votes);
              const isFinalRound = roundIndex === rounds.length - 1;

              return (
                <div key={roundIndex} className="results-round">
                  <div
                    className="results-round-header"
                    onClick={() => toggleRound(roundIndex)}
                  >
                    <div className="results-round-title">
                      <span>{t('results.round', { n: roundIndex + 1 })}</span>
                      {eliminated && (
                        <span className="results-round-eliminated">
                          {'✕ ' + t('results.eliminated', { title: getMovieTitle(eliminated) })}
                        </span>
                      )}
                      {!eliminated && isFinalRound && winner && (
                        <span className="results-round-winner">
                          {'👑 ' + t('results.wins', { title: getMovieTitle(winner) })}
                        </span>
                      )}
                    </div>
                    <span className={`results-round-toggle ${isOpen ? 'open' : ''}`}>▾</span>
                  </div>

                  {isOpen && (
                    <div className="results-round-body">
                      {Object.entries(votes)
                        .sort(([, a], [, b]) => b - a)
                        .map(([movieId, count]) => {
                          const title = getMovieTitle(movieId);
                          const pct = (count / maxVotes) * 100;
                          const isEliminated = movieId === eliminated;
                          const isWinner = movieId === winner || title === winnerTitle;
                          const isTied = round.tieBreak?.tied?.includes(movieId);

                          return (
                            <div key={movieId} className={`vote-bar-row ${isTied ? 'vote-bar-tied' : ''}`}>
                              <div className="vote-bar-label" title={title}>{title}</div>
                              <div className="vote-bar-track">
                                <div
                                  className={`vote-bar-fill ${isEliminated ? 'eliminated' : ''} ${isWinner && roundIndex === rounds.length - 1 ? 'winner' : ''}`}
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <div className="vote-bar-count">{count}</div>
                            </div>
                          );
                        })}
                      {round.tieBreak && (
                        <div className="tiebreak-info">
                          <span className="tiebreak-icon">⚖️</span>
                          <div>
                            <div>
                              {t('results.tiebreak', {
                                movies: round.tieBreak.tied.map(id => getMovieTitle(id)).join(', '),
                              })}
                              {' '}
                              {round.tieBreak.method === 'ranking'
                                ? t('results.tiebreakRanking')
                                : t('results.tiebreakRandom')}
                            </div>
                            {round.tieBreak.avgRankings && (
                              <div className="tiebreak-rankings">
                                {Object.entries(round.tieBreak.avgRankings)
                                  .sort(([, a], [, b]) => a - b)
                                  .map(([id, avg]) => (
                                    <div key={id} className="tiebreak-ranking-row">
                                      <span className="tiebreak-ranking-name">{getMovieTitle(id)}</span>
                                      <span className="tiebreak-ranking-value">{t('results.avgPosition')}: {avg}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
