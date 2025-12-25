-- Gathering cooldowns per resource node
CREATE TABLE IF NOT EXISTS character_gathering_cooldowns (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  node_code VARCHAR(64) NOT NULL,
  next_available_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, node_code)
);

CREATE INDEX IF NOT EXISTS idx_gathering_cooldowns_character
  ON character_gathering_cooldowns(character_id);
