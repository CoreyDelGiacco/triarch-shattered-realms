// Game entity types for Triarch: Shattered Realms

export interface Faction {
  id: number;
  name: string;
  code: string;
  philosophy: string;
  description: string;
  created_at: Date;
}

export interface Class {
  id: number;
  name: string;
  code: string;
  faction_id: number;
  role: string;
  description: string;
  playstyle: string;
  created_at: Date;
}

export type ZoneRisk = 'SAFE' | 'CONTESTED' | 'HIGH_RISK';
export type LootDropType = 'NONE' | 'PARTIAL' | 'FULL';
export type ResourceTier = 'COMMON' | 'MID_TIER' | 'EXOTIC';

export interface Zone {
  id: number;
  name: string;
  risk_level: ZoneRisk;
  pvp_enabled: boolean;
  loot_drop_on_death: LootDropType;
  description: string;
  resource_tier: ResourceTier;
  created_at: Date;
}

export interface Character {
  id: number;
  name: string;
  faction_id: number;
  class_id: number;
  level: number;
  power: number;
  control: number;
  resilience: number;
  experience: number;
  created_at: Date;
  updated_at: Date;
}

export interface Player {
  id: number;
  email: string;
  display_name: string;
  created_at: Date;
}

export interface PlayerSession {
  id: number;
  player_id: number;
  token: string;
  created_at: Date;
  expires_at: Date;
}

export interface CharacterWithDetails extends Character {
  faction?: Faction;
  class?: Class;
  abilities?: Ability[];
  traits?: PassiveTraitWithLevel[];
  skills?: SkillWithLevel[];
}

export type AbilityType = 'ACTIVE' | 'ULTIMATE';

export interface Ability {
  id: number;
  class_id: number;
  name: string;
  code: string;
  ability_type: AbilityType;
  cooldown_seconds: number;
  description: string;
  usage_notes: string;
  damage_modifier: number;
  properties: Record<string, unknown>;
  created_at: Date;
}

export interface CharacterAbility {
  id: number;
  character_id: number;
  ability_id: number;
  enhancement_level: number;
  created_at: Date;
}

export interface PassiveTrait {
  id: number;
  class_id: number;
  name: string;
  code: string;
  description: string;
  max_level: number;
  effects: Record<string, unknown>;
  created_at: Date;
}

export interface CharacterTrait {
  id: number;
  character_id: number;
  trait_id: number;
  current_level: number;
  created_at: Date;
}

export interface PassiveTraitWithLevel extends PassiveTrait {
  current_level: number;
}

export type SkillCategory = 'GATHERING' | 'CRAFTING' | 'COMBAT';

export interface Skill {
  id: number;
  name: string;
  code: string;
  category: SkillCategory;
  description: string;
  max_level: number | null;
  created_at: Date;
}

export interface CharacterSkill {
  id: number;
  character_id: number;
  skill_id: number;
  current_level: number;
  experience: number;
  created_at: Date;
  updated_at: Date;
}

export interface SkillWithLevel extends Skill {
  current_level: number;
  experience: number;
}

// Request/Response types for API
export interface CreateCharacterRequest {
  name: string;
  faction_id: number;
  class_id: number;
}

export interface UpdateCharacterStatsRequest {
  power?: number;
  control?: number;
  resilience?: number;
}

export interface AssignAbilityRequest {
  ability_id: number;
}

export interface AssignTraitRequest {
  trait_id: number;
  level?: number;
}

export interface UpdateSkillRequest {
  skill_id: number;
  experience_gained: number;
}

export interface RegisterPlayerRequest {
  email: string;
  password: string;
  display_name: string;
}

export interface LoginPlayerRequest {
  email: string;
  password: string;
}
