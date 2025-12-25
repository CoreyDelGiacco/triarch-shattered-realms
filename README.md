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

Use the returned `token` as a bearer token for session validation:

```bash
curl http://localhost:3000/api/auth/me -H "Authorization: Bearer <token>"
```

### World Quickstart

```bash
# Enter a zone and set a character position
curl -X POST http://localhost:3000/api/world/zone-enter \
  -H "Content-Type: application/json" \
  -d '{"character_id":1,"zone_id":2,"position":{"x":120.5,"y":88.25}}'

# Fetch the current world state for a character
curl http://localhost:3000/api/world/state/1
```

### Inventory Quickstart

```bash
# Add items to a character inventory
curl -X POST http://localhost:3000/api/inventory/1/add \
  -H "Content-Type: application/json" \
  -d '{"item_code":"IRON_ORE","quantity":5}'

# Remove items from a character inventory
curl -X POST http://localhost:3000/api/inventory/1/remove \
  -H "Content-Type: application/json" \
  -d '{"item_code":"IRON_ORE","quantity":2}'

# Fetch inventory
curl http://localhost:3000/api/inventory/1
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
├── docs/              # Design documentation
├── design/            # System design docs
├── migrations/        # Database migrations
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
