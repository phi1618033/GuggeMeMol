import { nanoid } from 'nanoid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, '..', '..', 'data', 'polls');

// Ensure data directory exists
fs.mkdirSync(DATA_DIR, { recursive: true });

class PollStore {
  constructor() {
    /** @type {Map<string, object>} pollId → poll */
    this._polls = new Map();
    /** @type {Map<string, string>} adminId → pollId */
    this._adminIndex = new Map();

    // Load existing polls from disk on startup
    this._loadAll();
  }

  /**
   * Load all poll JSON files from the data directory into memory.
   */
  _loadAll() {
    try {
      const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
      for (const file of files) {
        try {
          const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
          const poll = JSON.parse(raw);
          this._polls.set(poll.id, poll);
          this._adminIndex.set(poll.adminId, poll.id);
        } catch {
          // Skip corrupted files
        }
      }
      if (this._polls.size > 0) {
        console.log(`📂 Loaded ${this._polls.size} poll(s) from disk`);
      }
    } catch {
      // Data dir may not exist yet, that's fine
    }
  }

  /**
   * Persist a poll to disk as a JSON file.
   * @param {object} poll
   */
  _save(poll) {
    const filePath = path.join(DATA_DIR, `${poll.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(poll, null, 2));
  }

  /**
   * Create a new poll with the given movies.
   * @param {Array<object>} movies - Array of movie objects (OMDB data)
   * @returns {{ poll: object }} The created poll
   */
  createPoll(movies) {
    const pollId = nanoid(8);
    const adminId = nanoid(12);

    const poll = {
      id: pollId,
      adminId,
      movies,          // array of { imdbID, Title, Year, Poster, … }
      votes: [],       // array of ranked imdbID arrays
      status: 'open',
      results: null,
      createdAt: new Date().toISOString(),
    };

    this._polls.set(pollId, poll);
    this._adminIndex.set(adminId, pollId);
    this._save(poll);

    return { poll };
  }

  /**
   * Get a poll by its public pollId.
   * @param {string} pollId
   * @returns {object|undefined}
   */
  getPoll(pollId) {
    return this._polls.get(pollId);
  }

  /**
   * Get a poll by its secret adminId.
   * @param {string} adminId
   * @returns {object|undefined}
   */
  getPollByAdminId(adminId) {
    const pollId = this._adminIndex.get(adminId);
    if (!pollId) return undefined;
    return this._polls.get(pollId);
  }

  /**
   * Record a vote (ranking) on an open poll.
   * @param {string} pollId
   * @param {string[]} ranking - Ordered array of imdbIDs (most preferred first)
   * @returns {number} New total vote count
   * @throws {Error} If poll not found or not open
   */
  addVote(pollId, ranking) {
    const poll = this._polls.get(pollId);
    if (!poll) throw new Error('Poll not found');
    if (poll.status !== 'open') throw new Error('Poll is closed');

    poll.votes.push(ranking);
    this._save(poll);
    return poll.votes.length;
  }

  /**
   * Close a poll and store computed results.
   * @param {string} adminId
   * @param {object} results - RCV result object
   * @returns {object} The updated poll
   * @throws {Error} If poll not found or already closed
   */
  closePoll(adminId, results) {
    const poll = this.getPollByAdminId(adminId);
    if (!poll) throw new Error('Poll not found');
    if (poll.status === 'closed') throw new Error('Poll is already closed');

    poll.status = 'closed';
    poll.results = results;
    this._save(poll);
    return poll;
  }

  /**
   * Return all polls (for debugging / admin).
   * @returns {object[]}
   */
  getAllPolls() {
    return Array.from(this._polls.values());
  }
}

// Singleton – one store per process
const store = new PollStore();
export default store;
