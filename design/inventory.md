# Inventory (Authoritative)

## Overview

Inventory is stored server-side and validated on every mutation. The client never performs authoritative inventory changes.

## Endpoints

### GET /api/inventory/:characterId

Returns the authoritative inventory snapshot for a character.

### POST /api/inventory/:characterId/add

Adds quantity of an item to a character's inventory. Validates item existence and stack limits.

### POST /api/inventory/:characterId/remove

Removes quantity of an item from a character's inventory. Rejects removal if insufficient quantity.

## Persistence

`character_inventory` (PostgreSQL)
- `character_id` (FK to characters)
- `item_code` (string, references data/items.json)
- `quantity`
- `created_at`, `updated_at`

## Validation & Security

- Input validated with Zod.
- Rate limited for mutations.
- Server rejects unknown item codes and stack-limit violations.
