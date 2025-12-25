import { describe, expect, it } from "vitest";
import { calculateDeathDrops } from "../src/utils/loot";

describe("calculateDeathDrops", () => {
  it("returns no drops for NONE rule", () => {
    const result = calculateDeathDrops([
      { item_code: "IRON_ORE", quantity: 5 },
    ], "NONE");

    expect(result.dropped).toEqual([]);
    expect(result.remaining).toEqual([{ item_code: "IRON_ORE", quantity: 5 }]);
  });

  it("drops half of each stack for PARTIAL rule", () => {
    const result = calculateDeathDrops([
      { item_code: "IRON_ORE", quantity: 5 },
      { item_code: "COPPER_ORE", quantity: 2 },
    ], "PARTIAL");

    expect(result.dropped).toEqual([
      { item_code: "IRON_ORE", quantity: 2 },
      { item_code: "COPPER_ORE", quantity: 1 },
    ]);
    expect(result.remaining).toEqual([
      { item_code: "IRON_ORE", quantity: 3 },
      { item_code: "COPPER_ORE", quantity: 1 },
    ]);
  });

  it("drops everything for FULL rule", () => {
    const result = calculateDeathDrops([
      { item_code: "IRON_ORE", quantity: 5 },
    ], "FULL");

    expect(result.dropped).toEqual([{ item_code: "IRON_ORE", quantity: 5 }]);
    expect(result.remaining).toEqual([]);
  });
});
