import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const itemSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
  rarity: z.enum(["COMMON", "UNCOMMON", "RARE", "EPIC"]),
  stack_limit: z.number().int().positive().max(9999),
  value: z.number().int().min(0).max(1_000_000),
});

const zoneSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  risk_level: z.enum(["SAFE", "CONTESTED", "HIGH_RISK"]),
  pvp_enabled: z.boolean(),
  loot_drop_on_death: z.enum(["NONE", "PARTIAL", "FULL"]),
  description: z.string().min(2).max(500),
  resource_tier: z.enum(["COMMON", "MID_TIER", "EXOTIC"]),
});

const factionSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  philosophy: z.string().min(2).max(100),
  description: z.string().min(2).max(500),
});

const classSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  faction_id: z.number().int().positive(),
  role: z.string().min(2).max(50),
  description: z.string().min(2).max(500),
  playstyle: z.string().min(2).max(800),
});

const abilitySchema = z.object({
  id: z.number().int().positive(),
  class_id: z.number().int().positive(),
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50),
  ability_type: z.enum(["ACTIVE", "ULTIMATE"]),
  cooldown_seconds: z.number().int().positive(),
  description: z.string().min(2).max(500),
  usage_notes: z.string().min(2).max(500),
  damage_modifier: z.number().min(0),
  properties: z.record(z.unknown()),
});

const lootEntrySchema = z
  .object({
    item_code: z.string().min(2).max(64),
    min_quantity: z.number().int().positive(),
    max_quantity: z.number().int().positive(),
    weight: z.number().int().positive(),
  })
  .refine((entry) => entry.max_quantity >= entry.min_quantity, {
    message: "max_quantity must be >= min_quantity",
  });

const resourceNodeSchema = z.object({
  code: z.string().min(2).max(64),
  name: z.string().min(2).max(120),
  skill_code: z.string().min(2).max(50),
  zone_id: z.number().int().positive(),
  position: z.object({
    x: z.number().finite().min(-10000).max(10000),
    y: z.number().finite().min(-10000).max(10000),
  }),
  interaction_radius: z.number().positive().max(250),
  cooldown_seconds: z.number().int().positive().max(3600),
  min_skill_level: z.number().int().positive().max(99),
  loot_table: z.array(lootEntrySchema).min(1),
});

const itemsSchema = z.array(itemSchema).min(1);
const zonesSchema = z.array(zoneSchema).min(1);
const factionsSchema = z.array(factionSchema).min(1);
const classesSchema = z.array(classSchema).min(1);
const abilitiesSchema = z.array(abilitySchema).min(1);
const nodesSchema = z.array(resourceNodeSchema).min(1);

export type ItemDefinition = z.infer<typeof itemSchema>;
export type ZoneDefinition = z.infer<typeof zoneSchema>;
export type FactionDefinition = z.infer<typeof factionSchema>;
export type ClassDefinition = z.infer<typeof classSchema>;
export type AbilityDefinition = z.infer<typeof abilitySchema>;
export type ResourceNodeDefinition = z.infer<typeof resourceNodeSchema>;
export type LootEntryDefinition = z.infer<typeof lootEntrySchema>;

export interface GameData {
  items: Record<string, ItemDefinition>;
  zones: Record<number, ZoneDefinition>;
  factions: Record<number, FactionDefinition>;
  classes: Record<number, ClassDefinition>;
  abilities: Record<string, AbilityDefinition>;
  nodes: Record<string, ResourceNodeDefinition>;
}

const loadJsonFile = <T>(relativePath: string): T => {
  const filePath = path.resolve(__dirname, "..", "..", relativePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

const ensureUnique = <T extends { code?: string; id?: number }>(
  entries: T[],
  label: string,
  key: "code" | "id"
) => {
  const seen = new Set<string>();
  for (const entry of entries) {
    const raw = entry[key];
    if (raw === undefined) {
      continue;
    }
    const value = String(raw);
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label} ${key} detected: ${value}`);
    }
    seen.add(value);
  }
};

export const loadGameData = (): GameData => {
  const itemsRaw = loadJsonFile<unknown>("data/items.json");
  const zonesRaw = loadJsonFile<unknown>("data/zones.json");
  const factionsRaw = loadJsonFile<unknown>("data/factions.json");
  const classesRaw = loadJsonFile<unknown>("data/classes.json");
  const abilitiesRaw = loadJsonFile<unknown>("data/abilities.json");
  const nodesRaw = loadJsonFile<unknown>("data/nodes.json");

  const items = itemsSchema.parse(itemsRaw);
  const zones = zonesSchema.parse(zonesRaw);
  const factions = factionsSchema.parse(factionsRaw);
  const classes = classesSchema.parse(classesRaw);
  const abilities = abilitiesSchema.parse(abilitiesRaw);
  const nodes = nodesSchema.parse(nodesRaw);

  ensureUnique(items, "item", "code");
  ensureUnique(zones, "zone", "id");
  ensureUnique(factions, "faction", "id");
  ensureUnique(classes, "class", "id");
  ensureUnique(abilities, "ability", "code");
  ensureUnique(nodes, "node", "code");

  const itemsByCode: Record<string, ItemDefinition> = {};
  for (const item of items) {
    itemsByCode[item.code] = item;
  }

  const zonesById: Record<number, ZoneDefinition> = {};
  for (const zone of zones) {
    zonesById[zone.id] = zone;
  }

  const factionsById: Record<number, FactionDefinition> = {};
  for (const faction of factions) {
    factionsById[faction.id] = faction;
  }

  const classesById: Record<number, ClassDefinition> = {};
  for (const entry of classes) {
    if (!factionsById[entry.faction_id]) {
      throw new Error(`Class ${entry.code} references unknown faction ${entry.faction_id}`);
    }
    classesById[entry.id] = entry;
  }

  const abilitiesByCode: Record<string, AbilityDefinition> = {};
  for (const ability of abilities) {
    if (!classesById[ability.class_id]) {
      throw new Error(`Ability ${ability.code} references unknown class ${ability.class_id}`);
    }
    abilitiesByCode[ability.code] = ability;
  }

  const nodesByCode: Record<string, ResourceNodeDefinition> = {};
  for (const node of nodes) {
    if (!zonesById[node.zone_id]) {
      throw new Error(`Resource node ${node.code} references unknown zone ${node.zone_id}`);
    }
    for (const entry of node.loot_table) {
      if (!itemsByCode[entry.item_code]) {
        throw new Error(`Resource node ${node.code} references unknown item ${entry.item_code}`);
      }
    }
    nodesByCode[node.code] = node;
  }

  return {
    items: itemsByCode,
    zones: zonesById,
    factions: factionsById,
    classes: classesById,
    abilities: abilitiesByCode,
    nodes: nodesByCode,
  };
};
