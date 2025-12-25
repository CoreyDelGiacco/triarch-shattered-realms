-- Link characters to players
ALTER TABLE characters
  ADD COLUMN IF NOT EXISTS player_id INTEGER REFERENCES players(id);

INSERT INTO players (email, display_name, password_hash, password_salt)
SELECT 'system@triarch.local', 'System', 'migration', 'migration'
WHERE NOT EXISTS (SELECT 1 FROM players WHERE email = 'system@triarch.local');

UPDATE characters
SET player_id = (SELECT id FROM players WHERE email = 'system@triarch.local')
WHERE player_id IS NULL;

ALTER TABLE characters
  ALTER COLUMN player_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_characters_player ON characters(player_id);
