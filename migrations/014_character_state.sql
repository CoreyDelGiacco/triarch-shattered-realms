-- Character state for combat and death handling
CREATE TABLE IF NOT EXISTS character_state (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  current_hp INTEGER NOT NULL CHECK (current_hp >= 0),
  max_hp INTEGER NOT NULL CHECK (max_hp > 0),
  is_dead BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO character_state (character_id, current_hp, max_hp, is_dead)
SELECT id, 120, 120, FALSE
FROM characters
ON CONFLICT (character_id) DO NOTHING;
