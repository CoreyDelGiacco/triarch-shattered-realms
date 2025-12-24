-- Zone risk levels
CREATE TYPE zone_risk AS ENUM ('SAFE', 'CONTESTED', 'HIGH_RISK');

-- Zones: Different areas in the game world with varying risk levels
CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  risk_level zone_risk NOT NULL,
  pvp_enabled BOOLEAN NOT NULL DEFAULT false,
  loot_drop_on_death VARCHAR(50) NOT NULL, -- 'NONE', 'PARTIAL', 'FULL'
  description TEXT NOT NULL,
  resource_tier VARCHAR(50) NOT NULL, -- 'COMMON', 'MID_TIER', 'EXOTIC'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert example zones
INSERT INTO zones (name, risk_level, pvp_enabled, loot_drop_on_death, description, resource_tier) VALUES
(
  'Covenant Heartlands',
  'SAFE',
  false,
  'NONE',
  'The protected core territories of the Iron Covenant. Ideal for story quests, crafting, and casual play with no PvP or loot drop.',
  'COMMON'
),
(
  'Contested Borderlands',
  'CONTESTED',
  true,
  'PARTIAL',
  'Disputed territories where open PvP is enabled. Defeated players lose a few items or resources. Mid-tier resources and rewards available.',
  'MID_TIER'
),
(
  'The Shattered Wastes',
  'HIGH_RISK',
  true,
  'FULL',
  'Lawless full-loot PvP areas. If you die, everything you''re carrying can be looted. Contains the richest rewards including rare resources, relics, and powerful bosses.',
  'EXOTIC'
);
