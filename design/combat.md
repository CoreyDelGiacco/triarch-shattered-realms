# Combat Vertical Slice

## Goals
- Deliver a server-authoritative PvE encounter loop with cooldown validation.
- Provide deterministic, testable combat math for the training dummy NPC.

## Core Flow
1. Client requests NPC list for a zone (`GET /api/combat/npcs/:zoneId`).
2. Client issues `POST /api/combat/attack` with character + NPC IDs.
3. Server validates:
   - Session token and player ownership.
   - Character is alive.
   - Character and NPC are in the same zone.
   - Target is in range (12 units).
   - Ability cooldown (if supplied).
4. Server applies damage, updates NPC HP, and resolves NPC retaliation.
5. If the character dies, the death/loot rules apply immediately.

## Cooldowns
- Cooldowns are stored in `character_ability_cooldowns` keyed by character + ability.
- Server checks last_used_at against ability cooldown_seconds.

## NPCs
- NPC templates live in `npc_templates`.
- Spawn instances live in `npc_spawns` and hold current HP and respawn timers.
- Training dummy is seeded into zone 1 for immediate playtesting.

## Tunables
- Base damage: `10 + power * 2`.
- Attack range: 12 units.
- Respawn time: 60 seconds for the training dummy.
