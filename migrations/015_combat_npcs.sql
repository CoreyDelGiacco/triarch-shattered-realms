-- NPC templates and spawns for combat encounters
CREATE TABLE IF NOT EXISTS npc_templates (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  base_hp INTEGER NOT NULL CHECK (base_hp > 0),
  base_damage INTEGER NOT NULL CHECK (base_damage >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS npc_spawns (
  id SERIAL PRIMARY KEY,
  template_id INTEGER NOT NULL REFERENCES npc_templates(id) ON DELETE CASCADE,
  zone_id INTEGER NOT NULL REFERENCES zones(id),
  position_x NUMERIC(10, 3) NOT NULL,
  position_y NUMERIC(10, 3) NOT NULL,
  current_hp INTEGER NOT NULL CHECK (current_hp >= 0),
  respawn_seconds INTEGER NOT NULL CHECK (respawn_seconds > 0),
  last_defeated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (template_id, zone_id, position_x, position_y)
);

CREATE INDEX IF NOT EXISTS idx_npc_spawns_zone ON npc_spawns(zone_id);

CREATE TABLE IF NOT EXISTS character_ability_cooldowns (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  ability_id INTEGER NOT NULL REFERENCES abilities(id) ON DELETE CASCADE,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, ability_id)
);

INSERT INTO npc_templates (code, name, base_hp, base_damage)
VALUES ('TRAINING_DUMMY', 'Training Dummy', 120, 6)
ON CONFLICT (code) DO NOTHING;

INSERT INTO npc_spawns (template_id, zone_id, position_x, position_y, current_hp, respawn_seconds)
SELECT id, 1, 108.0, 96.0, 120, 60
FROM npc_templates
WHERE code = 'TRAINING_DUMMY'
ON CONFLICT (template_id, zone_id, position_x, position_y) DO NOTHING;
