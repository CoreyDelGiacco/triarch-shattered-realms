-- World state: authoritative character positions
CREATE TABLE IF NOT EXISTS character_positions (
  character_id INTEGER PRIMARY KEY REFERENCES characters(id) ON DELETE CASCADE,
  zone_id INTEGER NOT NULL REFERENCES zones(id),
  position_x NUMERIC(10, 3) NOT NULL,
  position_y NUMERIC(10, 3) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_character_positions_zone ON character_positions(zone_id);
