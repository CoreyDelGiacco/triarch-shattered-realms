-- Skills: Gathering and crafting skills (life skills)
CREATE TABLE IF NOT EXISTS skills (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  code VARCHAR(50) NOT NULL UNIQUE,
  category VARCHAR(50) NOT NULL, -- 'GATHERING', 'CRAFTING', 'COMBAT'
  description TEXT NOT NULL,
  max_level INTEGER, -- NULL means uncapped or soft-capped
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Character skills: Character's skill levels
CREATE TABLE IF NOT EXISTS character_skills (
  id SERIAL PRIMARY KEY,
  character_id INTEGER NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id),
  
  -- Current skill level
  current_level INTEGER NOT NULL DEFAULT 1 CHECK (current_level >= 1),
  experience INTEGER NOT NULL DEFAULT 0 CHECK (experience >= 0),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Each character can only have each skill once
  UNIQUE(character_id, skill_id)
);

-- Insert life skills
INSERT INTO skills (name, code, category, description, max_level) VALUES
('Mining', 'MINING', 'GATHERING', 'Extract ore and minerals from rocks and veins. Higher levels allow mining of rarer materials.', 99),
('Woodcutting', 'WOODCUTTING', 'GATHERING', 'Chop trees to gather wood and lumber. Advanced levels unlock exotic wood types.', 99),
('Fishing', 'FISHING', 'GATHERING', 'Catch fish and aquatic resources from bodies of water.', 99),
('Herbalism', 'HERBALISM', 'GATHERING', 'Gather herbs and plants for alchemy and crafting.', 99),
('Blacksmithing', 'BLACKSMITHING', 'CRAFTING', 'Forge weapons and armor from metals. Create equipment for warriors and tanks.', 99),
('Leatherworking', 'LEATHERWORKING', 'CRAFTING', 'Work with leather and hides to create light and medium armor.', 99),
('Tailoring', 'TAILORING', 'CRAFTING', 'Craft cloth armor and magical garments from fabrics.', 99),
('Alchemy', 'ALCHEMY', 'CRAFTING', 'Brew potions and elixirs with various effects using herbs and reagents.', 99),
('Enchanting', 'ENCHANTING', 'CRAFTING', 'Imbue items with magical properties and enhancements.', 99),
('Runecrafting', 'RUNECRAFTING', 'CRAFTING', 'Craft runes and inscriptions to enhance equipment with special effects.', 99),
('Cooking', 'COOKING', 'CRAFTING', 'Prepare food and drinks that provide temporary buffs.', 99);

CREATE INDEX idx_character_skills_character ON character_skills(character_id);
CREATE INDEX idx_character_skills_skill ON character_skills(skill_id);
