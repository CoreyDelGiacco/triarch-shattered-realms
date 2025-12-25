# Betrayal Questline

## Goals
- Allow faction switching only through a server-authoritative questline.
- Enforce reputation resets and penalties.

## Steps
1. `RENOUNCE` - Player commits to betrayal.
2. `PROVE` - Player advances once to show intent.
3. `COMPLETE` - Server swaps faction and applies reputation changes.

## Endpoints
- `POST /api/betrayal/start` — Begins the questline.
- `POST /api/betrayal/advance` — Advances the current step.
- `GET /api/betrayal/status/:characterId` — Reads latest quest state.

## Reputation Effects
- All factions reset to baseline (200).
- Previous faction receives a penalty (-500).
- New faction receives a bonus (+200 on top of baseline).

## Guardrails
- Only one active betrayal quest per character.
- Target faction must differ from current faction.
