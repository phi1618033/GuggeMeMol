import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env') });

const API_KEY = process.env.OMDB_API_KEY;
if (!API_KEY || API_KEY === 'your_api_key_here') {
  console.error('❌ Set a real OMDB_API_KEY in .env first');
  process.exit(1);
}

const movies = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'movies.json'), 'utf-8'));
console.log(`Fetching full OMDB data for ${movies.length} movies...\n`);

const results = [];
let failures = 0;

for (let i = 0; i < movies.length; i++) {
  const { id, title } = movies[i];
  const url = `http://www.omdbapi.com/?apikey=${API_KEY}&i=${id}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.Response === 'True') {
      results.push(data);
      console.log(`  ✅ [${i + 1}/${movies.length}] ${data.Title} (${data.Year})`);
    } else {
      failures++;
      console.log(`  ❌ [${i + 1}/${movies.length}] ${title} — ${data.Error}`);
    }
  } catch (err) {
    failures++;
    console.log(`  ❌ [${i + 1}/${movies.length}] ${title} — ${err.message}`);
  }

  // Small delay to avoid rate limiting
  if (i < movies.length - 1) {
    await new Promise(r => setTimeout(r, 120));
  }
}

const outPath = path.resolve(__dirname, 'client', 'public', 'test-movies.json');
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

console.log(`\n✅ Done! ${results.length} movies saved to client/public/test-movies.json`);
if (failures > 0) console.log(`⚠️  ${failures} failures`);
