# Assumptions

- Inventory uses a single stack per item per character for the initial vertical slice. Stack limits apply to the total quantity stored for that item in `character_inventory`. Multi-stack inventories will be added later as a dedicated system.
- World positions are only updated through the `zone-enter` RPC until movement syncing lands, so gathering range checks use the stored position from `character_positions` with static node coordinates in `/data/nodes.json`.
