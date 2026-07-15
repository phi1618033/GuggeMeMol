const BASE_URL = '';

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export function searchMovies(query) {
  return request(`/api/omdb/search?q=${encodeURIComponent(query)}`);
}

export function getMovieDetails(imdbId) {
  return request(`/api/omdb/movie/${encodeURIComponent(imdbId)}`);
}

export function createPoll(movies) {
  return request('/api/polls', {
    method: 'POST',
    body: JSON.stringify({ movies }),
  });
}

export function getPoll(pollId) {
  return request(`/api/polls/${encodeURIComponent(pollId)}`);
}

export function submitVote(pollId, ranking) {
  return request(`/api/polls/${encodeURIComponent(pollId)}/vote`, {
    method: 'POST',
    body: JSON.stringify({ ranking }),
  });
}

export function getAdminPoll(adminId) {
  return request(`/api/polls/admin/${encodeURIComponent(adminId)}`);
}

export function closePoll(adminId) {
  return request(`/api/polls/admin/${encodeURIComponent(adminId)}/close`, {
    method: 'POST',
  });
}

export function previewPoll(adminId) {
  return request(`/api/polls/admin/${encodeURIComponent(adminId)}/preview`);
}
