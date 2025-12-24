-- Classes: Character classes in the game
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  faction_id INTEGER REFERENCES factions(id),
  role VARCHAR(50) NOT NULL, -- Tank, DPS, Healer, Support
  description TEXT NOT NULL,
  playstyle TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the Bulwark class (Iron Covenant Tank)
INSERT INTO classes (name, code, faction_id, role, description, playstyle) VALUES
(
  'Bulwark',
  'BULWARK',
  (SELECT id FROM factions WHERE code = 'IRON_COVENANT'),
  'Tank',
  'A shield-bearing tank from the Iron Covenant faction. Bulwarks are elite vanguards armed with tower shields and sworn to protect allies and hold the line. They might be the ironclad knights defending Covenant strongholds.',
  'Bulwarks play methodically, advancing with shield raised and timing cooldowns to negate big enemy attacks and retaliate. In PvE, they hold boss aggro and use stuns/taunts to manage mobs. In PvP, they use crowd-control and body-blocking to protect teammates or lock down key foes. Their damage is moderate, but their presence can turn the tide by making their team much harder to kill.'
);
