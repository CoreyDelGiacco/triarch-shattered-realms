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
