import { Router } from 'express';
import store from '../lib/store.js';
import { computeRCV } from '../lib/rcv.js';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/polls  –  Create a new poll
// ---------------------------------------------------------------------------
router.post('/', (req, res) => {
  try {
    const { movies } = req.body;

    if (!Array.isArray(movies) || movies.length < 2) {
      return res.status(400).json({ error: 'At least 2 movies are required' });
    }

    // Basic sanity: every movie must have an imdbID
    for (const m of movies) {
      if (!m.imdbID) {
        return res
          .status(400)
          .json({ error: 'Every movie must include an imdbID' });
      }
    }

    const { poll } = store.createPoll(movies);

    return res.status(201).json({
      pollId: poll.id,
      adminId: poll.adminId,
    });
  } catch (err) {
    console.error('POST /api/polls error:', err);
    return res.status(500).json({ error: 'Failed to create poll' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/polls/:pollId  –  Public poll view
// ---------------------------------------------------------------------------
router.get('/:pollId', (req, res) => {
  try {
    const poll = store.getPoll(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    return res.json({
      id: poll.id,
      movies: poll.movies,
      status: poll.status,
      voteCount: poll.votes.length,
      results: poll.results,
      createdAt: poll.createdAt,
    });
  } catch (err) {
    console.error('GET /api/polls/:pollId error:', err);
    return res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/polls/:pollId/vote  –  Submit a ranked-choice vote
// ---------------------------------------------------------------------------
router.post('/:pollId/vote', (req, res) => {
  try {
    const poll = store.getPoll(req.params.pollId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    if (poll.status !== 'open') {
      return res.status(409).json({ error: 'Poll is closed' });
    }

    const { ranking } = req.body;

    if (!Array.isArray(ranking) || ranking.length === 0) {
      return res.status(400).json({ error: 'ranking must be a non-empty array of imdbIDs' });
    }

    // Validate that every ID in the ranking belongs to this poll
    const validIds = new Set(poll.movies.map((m) => m.imdbID));
    for (const id of ranking) {
      if (!validIds.has(id)) {
        return res
          .status(400)
          .json({ error: `Invalid movie ID in ranking: ${id}` });
      }
    }

    const voteCount = store.addVote(poll.id, ranking);

    // Broadcast live vote count via WebSocket
    const wsManager = req.app.locals.wsManager;
    if (wsManager) {
      wsManager.broadcastToPoll(poll.id, {
        type: 'voteUpdate',
        voteCount,
      });
    }

    return res.json({ success: true, voteCount });
  } catch (err) {
    console.error('POST /api/polls/:pollId/vote error:', err);
    return res.status(500).json({ error: 'Failed to record vote' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/polls/admin/:adminId  –  Admin poll view
// ---------------------------------------------------------------------------
router.get('/admin/:adminId', (req, res) => {
  try {
    const poll = store.getPollByAdminId(req.params.adminId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    return res.json({
      id: poll.id,
      adminId: poll.adminId,
      movies: poll.movies,
      status: poll.status,
      voteCount: poll.votes.length,
      results: poll.results,
      createdAt: poll.createdAt,
    });
  } catch (err) {
    console.error('GET /api/polls/admin/:adminId error:', err);
    return res.status(500).json({ error: 'Failed to fetch poll' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/polls/admin/:adminId/preview  –  Peek at current top 3 (full RCV)
// ---------------------------------------------------------------------------
router.get('/admin/:adminId/preview', (req, res) => {
  try {
    const poll = store.getPollByAdminId(req.params.adminId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }

    if (poll.votes.length === 0) {
      return res.json({ top3: [], totalVotes: 0 });
    }

    const movieIds = poll.movies.map(m => m.imdbID);
    const rcv = computeRCV(poll.votes, movieIds);

    // Build standings: winner is #1, then reverse elimination order
    const standings = [];
    if (rcv.winner) standings.push(rcv.winner);
    for (let i = rcv.rounds.length - 1; i >= 0; i--) {
      if (rcv.rounds[i].eliminated) standings.push(rcv.rounds[i].eliminated);
    }

    // Get final-round vote counts for display
    const finalCounts = rcv.rounds[rcv.rounds.length - 1]?.counts || {};

    const top3 = standings.slice(0, 3).map(imdbID => {
      const movie = poll.movies.find(m => m.imdbID === imdbID);
      return { imdbID, title: movie?.Title || imdbID, votes: finalCounts[imdbID] ?? '-' };
    });

    return res.json({ top3, totalVotes: poll.votes.length });
  } catch (err) {
    console.error('GET /api/polls/admin/:adminId/preview error:', err);
    return res.status(500).json({ error: 'Failed to generate preview' });
  }
});

// ---------------------------------------------------------------------------
// POST /api/polls/admin/:adminId/close  –  Close poll & compute results
// ---------------------------------------------------------------------------
router.post('/admin/:adminId/close', (req, res) => {
  try {
    const poll = store.getPollByAdminId(req.params.adminId);
    if (!poll) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    if (poll.status === 'closed') {
      return res.status(409).json({ error: 'Poll is already closed' });
    }

    const movieIds = poll.movies.map((m) => m.imdbID);
    const results = computeRCV(poll.votes, movieIds);

    store.closePoll(req.params.adminId, results);

    // Broadcast results to all connected voters
    const wsManager = req.app.locals.wsManager;
    if (wsManager) {
      wsManager.broadcastToPoll(poll.id, {
        type: 'pollClosed',
        results,
      });
    }

    return res.json({ success: true, results });
  } catch (err) {
    console.error('POST /api/polls/admin/:adminId/close error:', err);
    return res.status(500).json({ error: 'Failed to close poll' });
  }
});

export default router;
