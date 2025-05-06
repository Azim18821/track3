CREATE TABLE IF NOT EXISTS trainer_client_requests (
  id SERIAL PRIMARY KEY,
  trainer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending',
  message TEXT,
  response_at TIMESTAMP
);
