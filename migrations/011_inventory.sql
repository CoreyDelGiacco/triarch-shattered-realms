-- Inventory: authoritative character inventory
CREATE TABLE IF NOT EXISTS character_inventory (
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  item_code VARCHAR(64) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (character_id, item_code)
);

CREATE INDEX idx_character_inventory_character ON character_inventory(character_id);
