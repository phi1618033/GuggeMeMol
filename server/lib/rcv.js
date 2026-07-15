/**
 * Simple deterministic hash for a string (djb2).
 * Used to pseudo-randomly break ties in a reproducible way.
 */
function hashCode(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Compute ranked-choice (instant-runoff) voting results.
 *
 * @param {string[][]} votes   - Each ballot is an ordered array of movieIds (most preferred first)
 * @param {string[]}   movieIds - All candidate movieIds participating in this poll
 * @returns {{ winner: string|null, rounds: Array<{ counts: Record<string, number>, eliminated: string|null }>, totalVotes: number }}
 */
export function computeRCV(votes, movieIds) {
  const totalVotes = votes.length;

  // Edge: no votes at all
  if (totalVotes === 0) {
    return { winner: null, rounds: [], totalVotes: 0 };
  }

  // Edge: single candidate
  if (movieIds.length === 1) {
    return {
      winner: movieIds[0],
      rounds: [{ counts: { [movieIds[0]]: totalVotes }, eliminated: null }],
      totalVotes,
    };
  }

  // Deep-copy ballots so we can mutate them during elimination
  let ballots = votes.map((b) => [...b]);
  // Keep original ballots for consistent tie-break position calculations
  const originalBallots = votes.map((b) => [...b]);
  let remaining = new Set(movieIds);
  const rounds = [];

  while (remaining.size > 1) {
    // 1. Count first-choice votes among remaining candidates
    const counts = {};
    for (const id of remaining) counts[id] = 0;

    for (const ballot of ballots) {
      // Find the first still-remaining candidate on this ballot
      const top = ballot.find((id) => remaining.has(id));
      if (top) counts[top]++;
    }

    // 2. Check for majority winner (> 50 %)
    const activeBallots = Object.values(counts).reduce((a, b) => a + b, 0);
    const majorityThreshold = activeBallots / 2;

    let winner = null;
    for (const [id, c] of Object.entries(counts)) {
      if (c > majorityThreshold) {
        winner = id;
        break;
      }
    }

    if (winner) {
      rounds.push({ counts: { ...counts }, eliminated: null });
      return { winner, rounds, totalVotes };
    }

    // 3. Find candidate(s) with fewest first-choice votes
    const minCount = Math.min(...Object.values(counts));
    const weakest = Object.entries(counts).filter(([, c]) => c === minCount);

    let toEliminate;
    let tieBreak = null;

    if (weakest.length === 1) {
      toEliminate = weakest[0][0];
    } else {
      // Tie-break: eliminate the candidate ranked worst on average across
      // the ORIGINAL (unmodified) ballots, so values stay consistent across rounds.
      const positionSums = {};
      for (const [id] of weakest) positionSums[id] = 0;
      for (const ballot of originalBallots) {
        for (let i = 0; i < ballot.length; i++) {
          if (ballot[i] in positionSums) positionSums[ballot[i]] += i;
        }
      }
      const maxSum = Math.max(...Object.values(positionSums));
      // If still tied, use a deterministic hash to pseudo-randomly pick one
      const tiedAfterPosition = Object.entries(positionSums)
        .filter(([, s]) => s === maxSum)
        .map(([id]) => id)
        .sort((a, b) => hashCode(a) - hashCode(b));
      toEliminate = tiedAfterPosition[0];

      tieBreak = {
        tied: weakest.map(([id]) => id),
        method: tiedAfterPosition.length > 1 ? 'random' : 'ranking',
        avgRankings: Object.fromEntries(
          Object.entries(positionSums).map(([id, sum]) => [id, +(sum / originalBallots.length).toFixed(2)])
        ),
      };
    }

    rounds.push({ counts: { ...counts }, eliminated: toEliminate, tieBreak });
    remaining.delete(toEliminate);

    // 4. Strip eliminated candidate from every ballot
    ballots = ballots.map((b) => b.filter((id) => id !== toEliminate));
  }

  // Only one candidate left
  const lastStanding = [...remaining][0];
  const finalCounts = {};
  finalCounts[lastStanding] = ballots.filter((b) =>
    b.some((id) => remaining.has(id)),
  ).length;

  rounds.push({ counts: finalCounts, eliminated: null });

  return { winner: lastStanding, rounds, totalVotes };
}
