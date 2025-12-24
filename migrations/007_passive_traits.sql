-- Passive Traits: Passive bonuses and specializations for characters
CREATE TABLE IF NOT EXISTS passive_traits (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  max_level INTEGER NOT NULL DEFAULT 1 CHECK (max_level > 0),
  
  -- Trait effects (stored as JSON for flexibility)
  effects JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Character traits: Which passive traits a character has invested in
CREATE TABLE IF NOT EXISTS character_traits (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  trait_id INTEGER NOT NULL REFERENCES passive_traits(id),
  
  -- Current investment level
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Each character can only have each trait once
  UNIQUE(character_id, trait_id)
);

-- Insert Bulwark passive traits
INSERT INTO passive_traits (class_id, name, code, description, max_level, effects) VALUES
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Shield Specialist',
  'SHIELD_SPECIALIST',
  '+5% chance to block attacks. Successful blocks grant small damage bonus on next Shield Slam.',
  3,
  '{"block_chance_increase": 0.05, "damage_bonus_on_block": true}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Iron Fortress',
  'IRON_FORTRESS',
  'Increases Defensive Stance duration by 2 seconds OR increases Shield Wall absorption by 10%.',
  3,
  '{"defensive_stance_duration_bonus": 2, "shield_wall_absorption_bonus": 0.10}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Retribution',
  'RETRIBUTION',
  'Every block or parry deals small holy damage to attackers. Helps Bulwark contribute more damage and punishes focus fire.',
  3,
  '{"damage_on_block": true, "damage_type": "holy", "scales_with": "power"}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Inspire Allies',
  'INSPIRE_ALLIES',
  'Allies near the Bulwark gain minor armor bonus (+5%). Fits theme of protective leader.',
  3,
  '{"armor_bonus_radius": 10, "armor_bonus_percent": 0.05}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Last Stand',
  'LAST_STAND',
  'Once per few minutes, if health drops below 20%, instantly recover 15% health. Clutch survival passive with internal cooldown.',
  1,
  '{"health_threshold": 0.20, "health_recovery": 0.15, "cooldown_minutes": 3}'
);

CREATE INDEX idx_passive_traits_class ON passive_traits(class_id);
CREATE INDEX idx_character_traits_character ON character_traits(character_id);
