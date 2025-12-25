# Death & Loot Rules

## Goals
- Enforce risk-tier loot drops server-side.
- Create loot containers that players can claim.

## Zone Rules
- SAFE: No loot drops on death.
- CONTESTED: Drop half of each stack (rounded down).
- HIGH_RISK: Drop full inventory.

## Flow
1. Character HP reaches 0 in combat.
2. Server:
   - Marks character dead in `character_state`.
   - Calculates drop stacks based on zone rule.
   - Creates `loot_containers` and `loot_container_items`.
   - Removes dropped items from `character_inventory`.

## Loot Claim
- `GET /api/loot/containers/:characterId` lists containers in the character's zone.
- `POST /api/loot/containers/:containerId/claim` moves items to inventory after range + stack checks.

## Anti-Cheat Checks
- Zone alignment and distance checks for loot claims.
- Stack limit validation before transfer.
