# Assumptions

- Inventory uses a single stack per item per character for the initial vertical slice. Stack limits apply to the total quantity stored for that item in `character_inventory`. Multi-stack inventories will be added later as a dedicated system.
- World positions are only updated through the `zone-enter` RPC until movement syncing lands, so gathering range checks use the stored position from `character_positions` with static node coordinates in `/data/nodes.json`.
- Zone-tier death loot uses deterministic rules to keep tests predictable: SAFE drops nothing, CONTESTED drops half of each inventory stack (rounded down), and HIGH_RISK drops full stacks.
- Combat uses a simple base damage formula (`10 + power * 2`) and a fixed attack range (12 units) for the training dummy slice until full combat tuning lands.
- Betrayal reputation resets set all factions to a neutral baseline (200), apply a penalty to the previous faction (-500), and grant a bonus to the new faction (400) to make the switch feel impactful during tests.
