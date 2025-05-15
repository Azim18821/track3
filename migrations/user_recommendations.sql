-- Create user_recommendations table
CREATE TABLE IF NOT EXISTS user_recommendations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_recommendation_date DATE,
  auto_show_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create an index for faster lookups by user_id
CREATE INDEX IF NOT EXISTS user_recommendations_user_id_idx ON user_recommendations(user_id);