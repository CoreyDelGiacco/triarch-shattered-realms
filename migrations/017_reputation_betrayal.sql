-- Reputation tracking per character/faction
CREATE TABLE IF NOT EXISTS character_reputation (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  faction_id INTEGER NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, faction_id)
);

INSERT INTO character_reputation (character_id, faction_id, value)
SELECT c.id, f.id, CASE WHEN c.faction_id = f.id THEN 500 ELSE 0 END
FROM characters c
CROSS JOIN factions f
ON CONFLICT (character_id, faction_id) DO NOTHING;

-- Betrayal questline state
CREATE TABLE IF NOT EXISTS betrayal_quests (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  target_faction_id INTEGER NOT NULL REFERENCES factions(id),
  current_step VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CHECK (current_step IN ('RENOUNCE', 'PROVE', 'COMPLETE')),
  CHECK (status IN ('IN_PROGRESS', 'COMPLETED', 'FAILED'))
);

CREATE INDEX IF NOT EXISTS idx_betrayal_character ON betrayal_quests(character_id);
