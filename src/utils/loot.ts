export interface WeightedLootEntry {
  item_code: string;
  min_quantity: number;
  max_quantity: number;
  weight: number;
}

export interface LootSelection {
  item_code: string;
  quantity: number;
}

export interface InventoryStack {
  item_code: string;
  quantity: number;
}

export type DeathLootRule = "NONE" | "PARTIAL" | "FULL";

export const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const selectWeightedLoot = (
  entries: WeightedLootEntry[],
  rng: () => number = Math.random
): LootSelection => {
  if (entries.length === 0) {
    throw new Error("Loot table must contain at least one entry.");
  }

  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  const roll = rng() * totalWeight;

  let cumulative = 0;
  let selected = entries[entries.length - 1];
  for (const entry of entries) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      selected = entry;
      break;
    }
  }

  const quantityRange = selected.max_quantity - selected.min_quantity + 1;
  const quantityRoll = Math.floor(rng() * quantityRange);
  const quantity = selected.min_quantity + quantityRoll;

  return {
    item_code: selected.item_code,
    quantity,
  };
};

export const calculateDeathDrops = (
  inventory: InventoryStack[],
  rule: DeathLootRule
): { dropped: InventoryStack[]; remaining: InventoryStack[] } => {
  if (rule === "NONE") {
    return {
      dropped: [],
      remaining: inventory.map((stack) => ({ ...stack })),
    };
  }

  const dropped: InventoryStack[] = [];
  const remaining: InventoryStack[] = [];

  for (const stack of inventory) {
    if (rule === "FULL") {
      dropped.push({ ...stack });
      continue;
    }

    const dropQuantity = Math.floor(stack.quantity / 2);
    const keepQuantity = stack.quantity - dropQuantity;

    if (dropQuantity > 0) {
      dropped.push({ item_code: stack.item_code, quantity: dropQuantity });
    }
    if (keepQuantity > 0) {
      remaining.push({ item_code: stack.item_code, quantity: keepQuantity });
    }
  }

  return { dropped, remaining };
};
