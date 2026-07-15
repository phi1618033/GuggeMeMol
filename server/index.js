import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

// Resolve .env from the monorepo root (one level above /server)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

import { WebSocketManager } from './lib/websocket.js';
import pollRoutes from './routes/polls.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ---------- Middleware ----------
app.use(cors());
app.use(express.json());

// Request logging
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ---------- HTTP + WebSocket server ----------
const server = createServer(app);
const wss = new WebSocketServer({ server });
const wsManager = new WebSocketManager(wss);

// Make the WS manager available to route handlers
app.locals.wsManager = wsManager;

// ---------- Routes ----------
app.use('/api/polls', pollRoutes);

// --- OMDB proxy: search ---
app.get('/api/omdb/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OMDB API key is not configured' });
    }

    // If the query looks like an IMDb ID, fetch by ID instead of searching
    const isImdbId = /^tt\d+$/i.test(query.trim());
    const url = isImdbId
      ? `http://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(query.trim())}`
      : `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query.trim())}`;

    const response = await fetch(url);
    const data = await response.json();

    return res.json(data);
  } catch (err) {
    console.error('OMDB search error:', err);
    return res.status(502).json({ error: 'Failed to reach OMDB API' });
  }
});

// --- OMDB proxy: single movie by IMDb ID ---
app.get('/api/omdb/movie/:imdbId', async (req, res) => {
  try {
    const { imdbId } = req.params;

    const apiKey = process.env.OMDB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'OMDB API key is not configured' });
    }

    const url = `http://www.omdbapi.com/?apikey=${apiKey}&i=${encodeURIComponent(imdbId)}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.Response === 'False') {
      return res.status(404).json({ error: data.Error || 'Movie not found' });
    }

    return res.json(data);
  } catch (err) {
    console.error('OMDB movie error:', err);
    return res.status(502).json({ error: 'Failed to reach OMDB API' });
  }
});

// ---------- Health check ----------
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// ---------- Static files (production only) ----------
import fs from 'fs';
const clientDist = path.resolve(__dirname, '..', 'client', 'dist');

if (process.env.NODE_ENV === 'production') {
  const hasClientDist = fs.existsSync(path.join(clientDist, 'index.html'));
  if (hasClientDist) {
    app.use(express.static(clientDist));
    // SPA fallback – serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
    console.log(`📁 Serving static files from ${clientDist}`);
  } else {
    console.warn(`⚠️  NODE_ENV=production but no client build found at ${clientDist}`);
  }
} else {
  console.log(`🔧 Dev mode — use Vite dev server (http://localhost:5173) for the frontend`);
}

// ---------- Error handlers ----------
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled rejection:', err);
});

// ---------- Start ----------
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🎬 GuggeMeMol server running on http://0.0.0.0:${PORT}`);
  console.log(`🔑 OMDB API key: ${process.env.OMDB_API_KEY ? 'configured' : '⚠️  MISSING'}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});
