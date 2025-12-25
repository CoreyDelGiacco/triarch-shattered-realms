# Triarch: Shattered Realms

A mobile-first MMORPG that blends classic MMO design with modern sensibilities.

## Overview

Triarch: Shattered Realms combines World of Warcraft's clear class identities, Old School RuneScape's risk-versus-reward mechanics, and compact world design for a fast-paced, session-friendly MMO where player decisions matter.

## Key Features

- **Capped Progression**: Level cap at 60 with horizontal endgame progression
- **Three-Faction Warfare**: Dynamic political landscape with Iron Covenant, Verdant Reach, and Abyssal Remnant
- **Risk-Based Zones**: From safe PvE areas to full-loot PvP zones
- **Player-Driven Economy**: Crafting, gathering, and trading systems
- **Mobile-Optimized**: Short, tactical combat sessions (30-90 seconds)
- **Skill-Based Gameplay**: Limited ability sets (4-6 active + 1 ultimate) emphasizing strategy over button-mashing

## Documentation

For comprehensive design documentation, see:
- [Gameplay Overview](docs/GAMEPLAY_OVERVIEW.md) - Full game design theory and mechanics
- [API Documentation](docs/API.md) - RESTful API endpoints and usage
- [Authentication Stub](design/authentication.md) - Initial player auth flow
- [Combat Slice](design/combat.md) - PvE combat and cooldown rules
- [Death & Loot](design/death_loot.md) - Zone-tier loot drops
- [Betrayal Questline](design/betrayal.md) - Faction switching flow
- [Unity Playtest Client](design/client_playtest.md) - Minimal engine client notes

## Getting Started

### Prerequisites
- Node.js >= 20
- PostgreSQL (optional, can be skipped with `SKIP_DB=true`)

### Installation

```bash
npm install
```

### Configuration

Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

### Running the Server

```bash
# Development mode with hot reload
npm run dev

# Production mode
npm run build
npm start
```

### Playtest Console (Minimal UI)

Open the playtest UI in a browser after the server starts:

```
http://localhost:3000
```

The UI lets you register/login, create a character, enter a zone, gather, fight NPCs, loot, and run the betrayal questline.

### Unity Playtest Client

A minimal Unity client lives in `client/unity` and renders a basic animated character + NPC with buttons for login, character creation, zone entry, and combat.

```bash
# Open in Unity Hub
open client/unity
```

See `client/unity/README.md` for setup steps.

### Auth Stub Quickstart

```bash
# Register a new player
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"player@example.com","password":"securepassword","display_name":"PlayerOne"}'

# Login and get a session token
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"player@example.com","password":"securepassword"}'
```

Use the returned `token` as a bearer token for authenticated routes:

```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

### Characters Quickstart

```bash
# Create a character (requires auth)
curl -X POST http://localhost:3000/api/characters \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"name":"PlayerOne","faction_id":1,"class_id":1}'

# List your characters
curl http://localhost:3000/api/characters \
  -H "Authorization: Bearer <token>"
```

### World Quickstart

```bash
# Enter a zone and set a character position
curl -X POST http://localhost:3000/api/world/zone-enter \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1,"zone_id":2,"position":{"x":120.5,"y":88.25}}'

# Fetch the current world state for a character
curl http://localhost:3000/api/world/state/1 \
  -H "Authorization: Bearer <token>"
```

### Inventory Quickstart

```bash
# Add items to a character inventory
curl -X POST http://localhost:3000/api/inventory/1/add \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"item_code":"IRON_ORE","quantity":5}'

# Remove items from a character inventory
curl -X POST http://localhost:3000/api/inventory/1/remove \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"item_code":"IRON_ORE","quantity":2}'

# Fetch inventory
curl http://localhost:3000/api/inventory/1 \
  -H "Authorization: Bearer <token>"
```

### Gathering Quickstart

```bash
# List gathering nodes in a zone
curl http://localhost:3000/api/gathering/nodes/1 \
  -H "Authorization: Bearer <token>"

# Attempt to gather from a node
curl -X POST http://localhost:3000/api/gathering/attempt \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1,"node_code":"COPPER_VEIN","client_position":{"x":112.0,"y":92.0}}'
```

### Combat Quickstart

```bash
# List NPCs in a zone
curl http://localhost:3000/api/combat/npcs/1 \
  -H "Authorization: Bearer <token>"

# Attack an NPC
curl -X POST http://localhost:3000/api/combat/attack \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1,"npc_id":1}'

# Revive after death
curl -X POST http://localhost:3000/api/combat/revive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1}'
```

### Loot Quickstart

```bash
# List loot containers in the current zone
curl http://localhost:3000/api/loot/containers/1 \
  -H "Authorization: Bearer <token>"

# Claim a loot container
curl -X POST http://localhost:3000/api/loot/containers/1/claim \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1}'
```

### Betrayal Quickstart

```bash
# Start a betrayal questline
curl -X POST http://localhost:3000/api/betrayal/start \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1,"target_faction_id":2}'

# Advance a betrayal step
curl -X POST http://localhost:3000/api/betrayal/advance \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"character_id":1}'

# Check betrayal status
curl http://localhost:3000/api/betrayal/status/1 \
  -H "Authorization: Bearer <token>"
```

### Database

```bash
# Run migrations
npm run migrate

# Seed initial data
npm run seed
```

### Testing

```bash
npm test
```

## Project Structure

```
├── client/            # Unity playtest client
├── docs/              # Design documentation
├── design/            # System design docs
├── migrations/        # Database migrations
├── public/            # Playtest UI
├── scripts/           # Utility scripts
├── src/              # Source code
│   ├── app.ts        # Express application
│   ├── config.ts     # Configuration management
│   ├── db.ts         # Database connection
│   └── server.ts     # Server entry point
└── tests/            # Test files
```

## License

This project is private and proprietary.
