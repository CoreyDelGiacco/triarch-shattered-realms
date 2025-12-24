-- Ability types
CREATE TYPE ability_type AS ENUM ('ACTIVE', 'ULTIMATE');

-- Abilities: Skills and abilities that classes can use
CREATE TABLE IF NOT EXISTS abilities (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  ability_type ability_type NOT NULL,
  cooldown_seconds INTEGER NOT NULL CHECK (cooldown_seconds > 0),
  description TEXT NOT NULL,
  usage_notes TEXT NOT NULL,
  damage_modifier DECIMAL(5,2) DEFAULT 1.0,
  
  -- Ability specific properties (stored as JSON for flexibility)
  properties JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Character abilities: Which abilities a character has learned/equipped
CREATE TABLE IF NOT EXISTS character_abilities (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  ability_id INTEGER NOT NULL REFERENCES abilities(id),
  
  -- Enhancement level (for upgrades)
  enhancement_level INTEGER NOT NULL DEFAULT 0 CHECK (enhancement_level >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Each character can only have each ability once
  UNIQUE(character_id, ability_id)
);

-- Insert Bulwark abilities
INSERT INTO abilities (class_id, name, code, ability_type, cooldown_seconds, description, usage_notes, properties) VALUES
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Shield Slam',
  'SHIELD_SLAM',
  'ACTIVE',
  15,
  'Bash the target with shield, dealing modest damage and stunning for 2 seconds. If the target was casting, interrupts the spell.',
  'Bread-and-butter opener to disrupt dangerous foes.',
  '{"stun_duration": 2, "interrupts_casting": true}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Defensive Stance',
  'DEFENSIVE_STANCE',
  'ACTIVE',
  20,
  'Brace for impact, reducing all damage taken by 30% for 6 seconds. Movement is slowed slightly during this stance.',
  'Reactive survival tool – time it to survive big enemy hits or focus fire.',
  '{"damage_reduction": 0.30, "duration": 6, "movement_penalty": 0.15}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Shield Wall',
  'SHIELD_WALL',
  'ACTIVE',
  60,
  'Raise a barrier that absorbs damage for all allies in a small radius behind you. For 4 seconds, the Bulwark and any allies immediately behind the shield have 50% of incoming damage absorbed by the Bulwark''s health.',
  'Critical defensive moment for the entire team. Can be countered by flanking or crowd-controlling the Bulwark.',
  '{"damage_redirect": 0.50, "duration": 4, "radius": 5, "debuff": "Shattered Armor"}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Taunting Shout',
  'TAUNTING_SHOUT',
  'ACTIVE',
  25,
  'Bellow a challenge, forcing nearby PvE enemies to switch aggro for 5 seconds. In PvP, marks up to 3 enemy players with "Challenged" debuff – if they attack anyone else, their damage is reduced by 20%.',
  'Tactical tool to protect healers or squishy allies.',
  '{"pve_duration": 5, "pvp_targets": 3, "pvp_damage_reduction": 0.20, "radius": 8}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Charging Assault',
  'CHARGING_ASSAULT',
  'ACTIVE',
  30,
  'Rush forward 15 meters with shield first. If you collide with an enemy, knock them back and briefly daze them (1s stun). Any allies in your path get a small speed boost.',
  'Engage fights or peel enemies off allies. Requires careful aim.',
  '{"range": 15, "knockback": 3, "daze_duration": 1, "ally_speed_boost": 0.15}'
),
(
  (SELECT id FROM classes WHERE code = 'BULWARK'),
  'Aegis of the Covenant',
  'AEGIS_OF_COVENANT',
  'ULTIMATE',
  90,
  'Call upon the Iron Covenant''s power to become a living bulwark for 8 seconds. Damage taken is halved, every hit blocked heals nearby allies, and gain crowd-control immunity for first 3 seconds.',
  'Anchor critical moments – standing ground on a flag while allies rally, or surviving a boss''s enraged phase.',
  '{"duration": 8, "damage_reduction": 0.50, "cc_immunity_duration": 3, "heal_radius": 10, "debuff": "Exhausted"}'
);

CREATE INDEX idx_abilities_class ON abilities(class_id);
CREATE INDEX idx_character_abilities_character ON character_abilities(character_id);
