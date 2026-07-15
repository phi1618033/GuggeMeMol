# 🎬 GuggeMeMol

Ranked-choice movie voting app. Create a poll, share the link, and let everyone rank the movies. The winner is determined by instant-runoff voting (RCV).

## Features

- **Movie Search** — Search via OMDB API with poster, rating and genre display
- **Drag-to-Rank** — Intuitive drag & drop ranking interface
- **Real-time Updates** — WebSocket-powered live vote counter
- **Ranked-Choice Voting** — Fair instant-runoff algorithm with transparent tie-breaking
- **Movie Details** — Click any card for full OMDB info (cast, plot, ratings, etc.)
- **Admin Dashboard** — Monitor votes, share QR code, secret top-3 preview (long-press close button)
- **i18n** — English and German (auto-detected from browser)
- **Mobile Friendly** — Touch support, back-button closes modals

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Express + WebSocket
- **Data**: JSON file store (one file per poll)
- **Deployment**: Docker / Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+
- An [OMDB API key](https://www.omdbapi.com/apikey.aspx)

### Setup

```bash
# Install dependencies
npm run install:all

# Create .env in the project root
echo "OMDB_API_KEY=your_key_here" > .env

# Start dev servers (backend + frontend)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### Docker

```bash
docker compose up -d --build
# App available at http://localhost:3001
```

## How Voting Works

1. **Create** a poll by searching and selecting movies
2. **Share** the voting link with participants
3. Each voter **ranks** all movies from favorite to least favorite
4. Admin **closes** the poll to reveal results
5. Winner is determined by **instant-runoff voting**:
   - Count first-choice votes
   - If no majority, eliminate the candidate with fewest votes
   - Redistribute eliminated candidate's votes to next choices
   - Repeat until a winner emerges

### Tie-Breaking

1. **Average ranking position** — The candidate ranked worst on average across all original ballots is eliminated
2. **Random** (deterministic hash) — If still tied, a hash-based pseudo-random pick decides

## License

MIT
