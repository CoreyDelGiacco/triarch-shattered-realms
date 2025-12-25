# Assumptions

- Inventory uses a single stack per item per character for the initial vertical slice. Stack limits apply to the total quantity stored for that item in `character_inventory`. Multi-stack inventories will be added later as a dedicated system.
- Existing zone, faction, and class data remains in the database for now while we introduce `/data` as the single source of truth for new item definitions.
