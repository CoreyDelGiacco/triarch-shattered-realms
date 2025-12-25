# Triarch: Shattered Realms - API Documentation

This document describes the RESTful API for Triarch: Shattered Realms game system.

## Base URL

```
http://localhost:3000
```

## Health Check

### GET /health

Check the health status of the server and database.

**Response:**
```json
{
  "status": "ok",
  "db": "ok"
}
```

---

## Authentication

Basic player registration and session handling.

### POST /api/auth/register

Create a new player account.

**Request Body:**
```json
{
  "email": "player@example.com",
  "password": "securepassword",
  "display_name": "PlayerOne"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "email": "player@example.com",
  "display_name": "PlayerOne",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Invalid payload
- 409 Conflict: Email already registered

### POST /api/auth/login

Login and receive a session token.

**Request Body:**
```json
{
  "email": "player@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "session_token_here",
  "expires_at": "2024-01-02T00:00:00.000Z",
  "player": {
    "id": 1,
    "email": "player@example.com",
    "display_name": "PlayerOne"
  }
}
```

**Error Responses:**
- 400 Bad Request: Invalid payload
- 401 Unauthorized: Invalid credentials

### GET /api/auth/me

Validate a session token and return the player profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "player": {
    "id": 1,
    "email": "player@example.com",
    "display_name": "PlayerOne"
  },
  "session": {
    "token": "session_token_here",
    "created_at": "2024-01-01T00:00:00.000Z",
    "expires_at": "2024-01-02T00:00:00.000Z"
  }
}
```

**Error Responses:**
- 401 Unauthorized: Missing/invalid token or expired session

---

## Factions

The three main factions in the game world.

### GET /api/factions

List all factions.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Iron Covenant",
    "code": "IRON_COVENANT",
    "philosophy": "Order/Industry",
    "description": "Values heavy armor and siege warfare...",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/factions/:id

Get details of a specific faction.

**Response:**
```json
{
  "id": 1,
  "name": "Iron Covenant",
  "code": "IRON_COVENANT",
  "philosophy": "Order/Industry",
  "description": "Values heavy armor and siege warfare...",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## Classes

Character classes available in the game.

### GET /api/classes

List all classes.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Bulwark",
    "code": "BULWARK",
    "faction_id": 1,
    "faction_name": "Iron Covenant",
    "faction_code": "IRON_COVENANT",
    "role": "Tank",
    "description": "A shield-bearing tank from the Iron Covenant faction...",
    "playstyle": "Bulwarks play methodically...",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/classes/:id

Get details of a specific class including abilities and passive traits.

**Response:**
```json
{
  "id": 1,
  "name": "Bulwark",
  "code": "BULWARK",
  "faction_id": 1,
  "faction_name": "Iron Covenant",
  "role": "Tank",
  "description": "A shield-bearing tank...",
  "playstyle": "Bulwarks play methodically...",
  "abilities": [
    {
      "id": 1,
      "class_id": 1,
      "name": "Shield Slam",
      "code": "SHIELD_SLAM",
      "ability_type": "ACTIVE",
      "cooldown_seconds": 15,
      "description": "Bash the target with shield...",
      "usage_notes": "Bread-and-butter opener...",
      "damage_modifier": 1.0,
      "properties": {
        "stun_duration": 2,
        "interrupts_casting": true
      }
    }
  ],
  "passive_traits": [
    {
      "id": 1,
      "class_id": 1,
      "name": "Shield Specialist",
      "code": "SHIELD_SPECIALIST",
      "description": "+5% chance to block attacks...",
      "max_level": 3,
      "effects": {
        "block_chance_increase": 0.05,
        "damage_bonus_on_block": true
      }
    }
  ]
}
```

---

## Zones

Game zones with different risk levels.

### GET /api/zones

List all zones.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Covenant Heartlands",
    "risk_level": "SAFE",
    "pvp_enabled": false,
    "loot_drop_on_death": "NONE",
    "description": "The protected core territories...",
    "resource_tier": "COMMON",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/zones/:id

Get details of a specific zone.

**Response:**
```json
{
  "id": 1,
  "name": "Covenant Heartlands",
  "risk_level": "SAFE",
  "pvp_enabled": false,
  "loot_drop_on_death": "NONE",
  "description": "The protected core territories...",
  "resource_tier": "COMMON",
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## World

Server-authoritative world state for character positions.

### POST /api/world/zone-enter

Enter a zone and set the character's authoritative position.

**Request Body:**
```json
{
  "character_id": 1,
  "zone_id": 2,
  "position": {
    "x": 120.5,
    "y": 88.25
  }
}
```

**Response:**
```json
{
  "character_id": 1,
  "zone": {
    "id": 2,
    "name": "Verdant Outskirts",
    "risk_level": "CONTESTED",
    "pvp_enabled": true,
    "loot_drop_on_death": "PARTIAL",
    "description": "A contested borderland...",
    "resource_tier": "MID_TIER",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "position": {
    "x": 120.5,
    "y": 88.25
  },
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Invalid payload
- 404 Not Found: Character or zone not found

### GET /api/world/state/:characterId

Fetch the current authoritative world state for a character.

**Response:**
```json
{
  "character_id": 1,
  "zone": {
    "id": 2,
    "name": "Verdant Outskirts",
    "risk_level": "CONTESTED",
    "pvp_enabled": true,
    "loot_drop_on_death": "PARTIAL",
    "description": "A contested borderland...",
    "resource_tier": "MID_TIER"
  },
  "position": {
    "x": 120.5,
    "y": 88.25
  },
  "updated_at": "2024-01-01T00:00:00.000Z",
  "server_time": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Invalid character id
- 404 Not Found: Character not found or has no world state

---

## Inventory

Server-authoritative character inventory.

### GET /api/inventory/:characterId

Fetch a character's inventory.

**Response:**
```json
{
  "character_id": 1,
  "items": [
    {
      "item": {
        "code": "IRON_ORE",
        "name": "Iron Ore",
        "description": "A chunk of iron ore used in basic crafting recipes.",
        "rarity": "COMMON",
        "stack_limit": 50,
        "value": 5
      },
      "item_code": "IRON_ORE",
      "quantity": 12
    }
  ]
}
```

**Error Responses:**
- 400 Bad Request: Invalid character id
- 404 Not Found: Character not found

### POST /api/inventory/:characterId/add

Add an item stack to a character's inventory.

**Request Body:**
```json
{
  "item_code": "IRON_ORE",
  "quantity": 5
}
```

**Response:** 201 Created
```json
{
  "character_id": 1,
  "item": {
    "code": "IRON_ORE",
    "name": "Iron Ore",
    "description": "A chunk of iron ore used in basic crafting recipes.",
    "rarity": "COMMON",
    "stack_limit": 50,
    "value": 5
  },
  "item_code": "IRON_ORE",
  "quantity": 17
}
```

**Error Responses:**
- 400 Bad Request: Invalid payload or stack limit exceeded
- 404 Not Found: Character or item not found

### POST /api/inventory/:characterId/remove

Remove quantity from a character's inventory.

**Request Body:**
```json
{
  "item_code": "IRON_ORE",
  "quantity": 5
}
```

**Response:**
```json
{
  "character_id": 1,
  "item": {
    "code": "IRON_ORE",
    "name": "Iron Ore",
    "description": "A chunk of iron ore used in basic crafting recipes.",
    "rarity": "COMMON",
    "stack_limit": 50,
    "value": 5
  },
  "item_code": "IRON_ORE",
  "quantity": 12
}
```

**Error Responses:**
- 400 Bad Request: Invalid payload or insufficient quantity
- 404 Not Found: Character, item, or item not owned

---

## Gathering

Server-authoritative gathering and resource nodes.

### GET /api/gathering/nodes/:zoneId

List available gathering nodes for a zone.

**Response:**
```json
{
  "zone_id": 1,
  "nodes": [
    {
      "code": "COPPER_VEIN",
      "name": "Copper Vein",
      "skill_code": "MINING",
      "zone_id": 1,
      "position": { "x": 112.4, "y": 92.8 },
      "interaction_radius": 8,
      "cooldown_seconds": 60,
      "min_skill_level": 1,
      "loot_table": [
        {
          "item_code": "COPPER_ORE",
          "min_quantity": 1,
          "max_quantity": 3,
          "weight": 65,
          "item": {
            "code": "COPPER_ORE",
            "name": "Copper Ore",
            "description": "Soft copper ore suitable for starter smithing recipes.",
            "rarity": "COMMON",
            "stack_limit": 50,
            "value": 4
          }
        }
      ]
    }
  ]
}
```

**Error Responses:**
- 400 Bad Request: Invalid zone id

### POST /api/gathering/attempt

Attempt to gather from a node (validated server-side).

**Request Body:**
```json
{
  "character_id": 1,
  "node_code": "COPPER_VEIN",
  "client_position": { "x": 112.0, "y": 92.0 }
}
```

**Response:** 201 Created
```json
{
  "character_id": 1,
  "node": {
    "code": "COPPER_VEIN",
    "name": "Copper Vein",
    "zone_id": 1,
    "skill_code": "MINING",
    "position": { "x": 112.4, "y": 92.8 },
    "interaction_radius": 8,
    "cooldown_seconds": 60,
    "min_skill_level": 1
  },
  "loot": {
    "item": {
      "code": "COPPER_ORE",
      "name": "Copper Ore",
      "description": "Soft copper ore suitable for starter smithing recipes.",
      "rarity": "COMMON",
      "stack_limit": 50,
      "value": 4
    },
    "item_code": "COPPER_ORE",
    "quantity": 2
  },
  "next_available_at": "2024-01-01T00:01:00.000Z",
  "server_time": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Invalid payload, zone mismatch, out of range, cooldown active, or skill too low
- 404 Not Found: Character not found, node not found, or character not in world
- 500 Internal Server Error: Loot item definition missing

---

## Skills

Gathering and crafting skills (life skills).

### GET /api/skills

List all skills. Optionally filter by category.

**Query Parameters:**
- `category` (optional): Filter by skill category (GATHERING, CRAFTING, COMBAT)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Mining",
    "code": "MINING",
    "category": "GATHERING",
    "description": "Extract ore and minerals from rocks and veins...",
    "max_level": 99,
    "created_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/skills/:id

Get details of a specific skill.

**Response:**
```json
{
  "id": 1,
  "name": "Mining",
  "code": "MINING",
  "category": "GATHERING",
  "description": "Extract ore and minerals from rocks and veins...",
  "max_level": 99,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

---

## Characters

Player characters with stats, abilities, and skills.

### GET /api/characters

List all characters.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Thoradin",
    "faction_id": 1,
    "faction_name": "Iron Covenant",
    "faction_code": "IRON_COVENANT",
    "class_id": 1,
    "class_name": "Bulwark",
    "class_code": "BULWARK",
    "level": 1,
    "power": 0,
    "control": 0,
    "resilience": 0,
    "experience": 0,
    "created_at": "2024-01-01T00:00:00.000Z",
    "updated_at": "2024-01-01T00:00:00.000Z"
  }
]
```

### GET /api/characters/:id

Get full details of a character including abilities, traits, and skills.

**Response:**
```json
{
  "id": 1,
  "name": "Thoradin",
  "faction_id": 1,
  "faction_name": "Iron Covenant",
  "class_id": 1,
  "class_name": "Bulwark",
  "class_role": "Tank",
  "level": 60,
  "power": 10,
  "control": 20,
  "resilience": 30,
  "experience": 1000000,
  "abilities": [
    {
      "id": 1,
      "name": "Shield Slam",
      "code": "SHIELD_SLAM",
      "ability_type": "ACTIVE",
      "cooldown_seconds": 15,
      "enhancement_level": 0
    }
  ],
  "traits": [
    {
      "id": 1,
      "name": "Shield Specialist",
      "code": "SHIELD_SPECIALIST",
      "description": "+5% chance to block attacks...",
      "max_level": 3,
      "current_level": 2,
      "effects": {}
    }
  ],
  "skills": [
    {
      "id": 1,
      "name": "Mining",
      "code": "MINING",
      "category": "GATHERING",
      "current_level": 45,
      "experience": 25000
    }
  ]
}
```

### POST /api/characters

Create a new character.

**Request Body:**
```json
{
  "name": "Thoradin",
  "faction_id": 1,
  "class_id": 1
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "name": "Thoradin",
  "faction_id": 1,
  "class_id": 1,
  "level": 1,
  "power": 0,
  "control": 0,
  "resilience": 0,
  "experience": 0,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Missing required fields or invalid IDs
- 409 Conflict: Character name already exists

### PATCH /api/characters/:id/stats

Update character stats (Power, Control, Resilience).

**Request Body:**
```json
{
  "power": 10,
  "control": 20,
  "resilience": 30
}
```

**Constraints:**
- Total stats cannot exceed character level
- All stats must be non-negative
- With level cap at 60, max total stats = 60

**Response:**
```json
{
  "id": 1,
  "name": "Thoradin",
  "level": 60,
  "power": 10,
  "control": 20,
  "resilience": 30,
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Invalid stat values or exceeds level
- 404 Not Found: Character not found

### POST /api/characters/:id/abilities

Assign an ability to a character.

**Request Body:**
```json
{
  "ability_id": 1
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "character_id": 1,
  "ability_id": 1,
  "enhancement_level": 0,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Missing ability_id or invalid ability
- 404 Not Found: Character not found
- 409 Conflict: Character already has this ability

### POST /api/characters/:id/traits

Assign a passive trait to a character.

**Request Body:**
```json
{
  "trait_id": 1,
  "level": 2
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "character_id": 1,
  "trait_id": 1,
  "current_level": 2,
  "created_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Missing trait_id, invalid trait, or level exceeds max_level
- 404 Not Found: Character not found
- 409 Conflict: Character already has this trait

### POST /api/characters/:id/skills

Update or add a character's skill experience.

**Request Body:**
```json
{
  "skill_id": 1,
  "experience_gained": 500
}
```

**Response:**
```json
{
  "id": 1,
  "character_id": 1,
  "skill_id": 1,
  "current_level": 1,
  "experience": 500,
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses:**
- 400 Bad Request: Missing required fields or invalid skill
- 404 Not Found: Character not found

---

## Game Design Constraints

### Level Cap
- Maximum character level: **60**
- No level cap increases in expansions
- Endgame focuses on horizontal progression

### Stat Allocation
- Total stat points = character level (max 60)
- Three core stats: Power, Control, Resilience
- Players must commit to a build
- Respecialization available but costly

### Abilities
- 4-6 active abilities per class
- 1 ultimate ability per class
- Clear, readable skill set (no ability bloat)
- Cooldowns range from 15s to 90s

### Passive Traits
- Multiple traits available per class
- Each trait has a max level (typically 1-3)
- Players can fully specialize in 2-3 traits
- Provides sidegrades, not major power increases

### Skills
- Level cap at 99 (or soft-capped with diminishing returns)
- Independent from combat level
- Supports player-driven economy
- Categorized as Gathering, Crafting, or Combat

### Zone Risk Levels
- **SAFE**: No PvP, no loot drop, common resources
- **CONTESTED**: Open PvP, partial loot drop, mid-tier resources
- **HIGH_RISK**: Full-loot PvP, exotic resources and rare rewards

---

## Example Workflows

### Creating and Building a Bulwark Tank

1. **Create character:**
```bash
POST /api/characters
{
  "name": "Thoradin",
  "faction_id": 1,  # Iron Covenant
  "class_id": 1     # Bulwark
}
```

2. **Allocate stats at level 60:**
```bash
PATCH /api/characters/1/stats
{
  "power": 10,
  "control": 20,
  "resilience": 30
}
```

3. **Assign abilities:**
```bash
POST /api/characters/1/abilities
{ "ability_id": 1 }  # Shield Slam

POST /api/characters/1/abilities
{ "ability_id": 2 }  # Defensive Stance

POST /api/characters/1/abilities
{ "ability_id": 3 }  # Shield Wall
```

4. **Invest in passive traits:**
```bash
POST /api/characters/1/traits
{
  "trait_id": 1,  # Shield Specialist
  "level": 3
}

POST /api/characters/1/traits
{
  "trait_id": 2,  # Iron Fortress
  "level": 3
}
```

5. **Train life skills:**
```bash
POST /api/characters/1/skills
{
  "skill_id": 1,  # Mining
  "experience_gained": 10000
}
```

### Querying Game Information

**Get all factions:**
```bash
GET /api/factions
```

**Get Bulwark class details with abilities:**
```bash
GET /api/classes/1
```

**Get high-risk zones:**
```bash
GET /api/zones
# Filter in application for risk_level: "HIGH_RISK"
```

**Get gathering skills:**
```bash
GET /api/skills?category=GATHERING
```
