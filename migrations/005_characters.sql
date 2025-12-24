-- Characters: Player characters
CREATE TABLE IF NOT EXISTS characters (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  faction_id INTEGER NOT NULL REFERENCES factions(id),
  class_id INTEGER NOT NULL REFERENCES classes(id),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 60),
  
  -- Core stats (max 60 points total, 1 per level)
  power INTEGER NOT NULL DEFAULT 0 CHECK (power >= 0),
  control INTEGER NOT NULL DEFAULT 0 CHECK (control >= 0),
  resilience INTEGER NOT NULL DEFAULT 0 CHECK (resilience >= 0),
  
  -- Experience and progression
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint: total stat points cannot exceed level
  CONSTRAINT stat_points_valid CHECK (power + control + resilience <= level)
);

-- Create index on faction and class for efficient queries
CREATE INDEX idx_characters_faction ON characters(faction_id);
CREATE INDEX idx_characters_class ON characters(class_id);
