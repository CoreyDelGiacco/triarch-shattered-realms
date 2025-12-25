import { describe, expect, it } from "vitest";
import { createSeededRandom, selectWeightedLoot } from "../src/utils/loot";

describe("selectWeightedLoot", () => {
  it("selects deterministic loot with a seeded rng", () => {
    const rng = createSeededRandom(1337);
    const lootTable = [
      { item_code: "COPPER_ORE", min_quantity: 1, max_quantity: 3, weight: 70 },
      { item_code: "IRON_ORE", min_quantity: 1, max_quantity: 2, weight: 30 },
    ];

    const first = selectWeightedLoot(lootTable, rng);
    const second = selectWeightedLoot(lootTable, rng);

    expect(first).toEqual({ item_code: "COPPER_ORE", quantity: 1 });
    expect(second).toEqual({ item_code: "IRON_ORE", quantity: 2 });
  });

  it("keeps quantities within the min/max range", () => {
    const rng = createSeededRandom(1);
    const lootTable = [
      { item_code: "ASH_LOG", min_quantity: 2, max_quantity: 4, weight: 100 },
    ];

    const result = selectWeightedLoot(lootTable, rng);
    expect(result.item_code).toBe("ASH_LOG");
    expect(result.quantity).toBeGreaterThanOrEqual(2);
    expect(result.quantity).toBeLessThanOrEqual(4);
  });
});
