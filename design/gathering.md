# Gathering System (Vertical Slice)

## Goals

- Provide server-authoritative gathering with node cooldowns, distance checks, and skill gating.
- Keep the system light enough for mobile sessions while enforcing anti-cheat fundamentals.

## Core Loop

1. Client fetches nodes for the current zone.
2. Player taps a node to gather.
3. Server validates:
   - Character exists and is in-world.
   - Character is in the same zone as the node.
   - Character is within interaction range (server position vs. node position).
   - Character has the required gathering skill level.
   - Node cooldown has expired.
4. Server rolls weighted loot and inserts items into inventory.
5. Server updates node cooldown and returns loot + next available time.

## Data Sources

- `/data/nodes.json`: static node definitions (position, cooldown, loot table).
- `/data/items.json`: loot item definitions and stack limits.

## Anti-Cheat Notes

- All validation happens server-side.
- Suspicious actions (zone mismatch, range violations, cooldown abuse, client/server position mismatch) are logged with player id + IP.

## Next Steps

- Add movement updates and server-side path validation.
- Add resource respawn variance and node depletion.
- Integrate gathering skill XP rewards.
