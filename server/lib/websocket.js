import { WebSocketServer } from 'ws';
import store from './store.js';

export class WebSocketManager {
  /**
   * @param {import('ws').Server} wss - The WebSocket.Server instance
   */
  constructor(wss) {
    this.wss = wss;

    /** @type {Map<import('ws'), Set<string>>} ws → set of pollIds */
    this._subscriptions = new Map();

    // --- Handle new connections ---
    this.wss.on('connection', (ws) => {
      this._subscriptions.set(ws, new Set());
      ws.isAlive = true;

      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw);
          this._handleMessage(ws, msg);
        } catch {
          // Ignore non-JSON or malformed messages
        }
      });

      ws.on('close', () => {
        this._subscriptions.delete(ws);
      });

      ws.on('error', () => {
        this._subscriptions.delete(ws);
      });
    });

    // --- Heartbeat: ping every 30 s, terminate dead sockets ---
    this._heartbeatInterval = setInterval(() => {
      for (const ws of this.wss.clients) {
        if (!ws.isAlive) {
          this._subscriptions.delete(ws);
          ws.terminate();
          continue;
        }
        ws.isAlive = false;
        ws.ping();
      }
    }, 30_000);

    // Clean up interval when the server closes
    this.wss.on('close', () => {
      clearInterval(this._heartbeatInterval);
    });
  }

  /**
   * Handle an incoming JSON message from a client.
   */
  _handleMessage(ws, msg) {
    const { type, pollId } = msg;

    if (type === 'subscribe' && typeof pollId === 'string') {
      const subs = this._subscriptions.get(ws);
      if (subs) subs.add(pollId);

      // Send current vote count so late-joiners see the real number
      const poll = store.getPoll(pollId);
      if (poll && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'subscribed',
          voteCount: poll.votes.length,
        }));
      }
    }

    if (type === 'unsubscribe' && typeof pollId === 'string') {
      const subs = this._subscriptions.get(ws);
      if (subs) subs.delete(pollId);
    }
  }

  /**
   * Broadcast a JSON-serialisable message to every client subscribed to `pollId`.
   * @param {string} pollId
   * @param {object} message
   */
  broadcastToPoll(pollId, message) {
    const payload = JSON.stringify(message);

    for (const [ws, subs] of this._subscriptions.entries()) {
      if (subs.has(pollId) && ws.readyState === ws.OPEN) {
        ws.send(payload);
      }
    }
  }

  /**
   * Return the number of active WebSocket connections subscribed to a poll.
   * @param {string} pollId
   * @returns {number}
   */
  getConnectionCount(pollId) {
    let count = 0;
    for (const [ws, subs] of this._subscriptions.entries()) {
      if (subs.has(pollId) && ws.readyState === ws.OPEN) {
        count++;
      }
    }
    return count;
  }
}
