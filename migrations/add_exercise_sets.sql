-- Create table for exercise sets
CREATE TABLE IF NOT EXISTS exercise_sets (
  id SERIAL PRIMARY KEY,
  exercise_id INTEGER NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight REAL,
  completed BOOLEAN DEFAULT FALSE,
  set_type TEXT,
  target_rpe REAL,
  tempo TEXT,
  distance REAL,
  duration REAL,
  rest_after REAL,
  notes TEXT,
  
  -- Ensure unique combination of exercise_id and set_number
  UNIQUE(exercise_id, set_number)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_exercise_sets_exercise_id ON exercise_sets(exercise_id);