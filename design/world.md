# World State (Authoritative)

## Overview

The world service records the authoritative zone and position of every character. The client acts as an input collector and renderer; all world state is validated and persisted server-side.

## Core Concepts

- **Zone entry**: A character announces intent to enter a zone with a spawn position. The server validates the character and zone, then stores the authoritative position.
- **World state fetch**: Clients request the latest authoritative position for reconciliation, including zone risk metadata needed for UI rules.

## Endpoints

### POST /api/world/zone-enter

- Validates payload with schema.
- Confirms character and zone exist.
- Upserts `character_positions` with the authoritative position.
- Returns zone metadata and updated position.

### GET /api/world/state/:characterId

- Validates the character id.
- Confirms the character exists.
- Returns the latest position and zone metadata, or a `CHARACTER_NOT_IN_WORLD` error if no state exists.

## Persistence

`character_positions` (PostgreSQL)
- `character_id` (PK, FK to characters)
- `zone_id` (FK to zones)
- `position_x`, `position_y`
- `updated_at`

## Validation & Security

- Input is validated with Zod.
- Requests are rate-limited per IP.
- Server remains authoritative for zone membership and position.
