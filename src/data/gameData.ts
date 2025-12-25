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

const itemsSchema = z.array(itemSchema).min(1);

export type ItemDefinition = z.infer<typeof itemSchema>;

export interface GameData {
  items: Record<string, ItemDefinition>;
}

const loadJsonFile = <T>(relativePath: string): T => {
  const filePath = path.resolve(__dirname, "..", "..", relativePath);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
};

export const loadGameData = (): GameData => {
  const itemsRaw = loadJsonFile<unknown>("data/items.json");
  const items = itemsSchema.parse(itemsRaw);

  const itemsByCode: Record<string, ItemDefinition> = {};
  for (const item of items) {
    if (itemsByCode[item.code]) {
      throw new Error(`Duplicate item code detected: ${item.code}`);
    }
    itemsByCode[item.code] = item;
  }

  return {
    items: itemsByCode,
  };
};
