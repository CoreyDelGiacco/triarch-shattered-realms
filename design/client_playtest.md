# Unity Playtest Client

## Goals
- Provide a lightweight Unity client that renders the vertical slice and drives server-authoritative actions.
- Keep UI minimal and mobile-friendly while still allowing quick smoke tests.

## Runtime Flow
1. Player logs in or registers.
2. Client loads reference data (factions/classes/zones) for dropdown selection.
3. Player creates/selects a character.
4. Player enters a zone and can fetch NPCs.
5. Player attacks with a simple animation pulse to visualize combat.

## Guardrails
- The client never applies authoritative outcomes.
- All mutations go through server APIs and display raw responses.
