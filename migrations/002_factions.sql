-- Factions: The three main factions in Triarch
CREATE TABLE IF NOT EXISTS factions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  philosophy TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert the three factions
INSERT INTO factions (name, code, philosophy, description) VALUES
(
  'Iron Covenant',
  'IRON_COVENANT',
  'Order/Industry',
  'Values heavy armor and siege warfare. The Iron Covenant embodies discipline, defense, and industrial might through fortifications and defensive capabilities.'
),
(
  'Verdant Reach',
  'VERDANT_REACH',
  'Nature/Magic',
  'Emphasizes mobility and PvE advantages. The Verdant Reach represents harmony with nature and magical prowess, offering agility and environmental advantages.'
),
(
  'Abyssal Remnant',
  'ABYSSAL_REMNANT',
  'Chaos/Void',
  'Thrives on risky power and self-damaging magic. The Abyssal Remnant pursues power through sacrifice and void manipulation with high-risk, high-reward abilities.'
);
