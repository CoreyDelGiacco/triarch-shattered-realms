-- Loot containers created on death or drops
CREATE TABLE IF NOT EXISTS loot_containers (
  id SERIAL PRIMARY KEY,
  zone_id INTEGER NOT NULL REFERENCES zones(id),
  position_x NUMERIC(10, 3) NOT NULL,
  position_y NUMERIC(10, 3) NOT NULL,
  owner_character_id INTEGER REFERENCES characters(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS loot_container_items (
  id SERIAL PRIMARY KEY,
  container_id INTEGER NOT NULL REFERENCES loot_containers(id) ON DELETE CASCADE,
  item_code VARCHAR(64) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_loot_containers_zone ON loot_containers(zone_id);
CREATE INDEX IF NOT EXISTS idx_loot_items_container ON loot_container_items(container_id);
