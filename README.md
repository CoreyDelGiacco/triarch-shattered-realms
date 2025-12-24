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

## Development Best Practices

### Git Workflow

1. **Never commit `node_modules`**: The `.gitignore` file is configured to exclude dependencies. Always verify with `git status` before committing.
2. **Check ignored files**: Use `git check-ignore -v <file>` to verify if a file is properly ignored.
3. **Clean working directory**: Ensure `git status` shows a clean state before creating commits.
4. **Review changes**: Use `git diff` to review all changes before committing.

### Dependency Management

- Dependencies are managed via `package.json` only
- `package-lock.json` is gitignored (existing project decision for development flexibility)
  - This allows developers to get the latest compatible versions within the specified ranges
  - Trade-off: May lead to version inconsistencies across different environments
  - **Note**: For production deployments requiring deterministic installs:
    - Option 1: Temporarily commit package-lock.json before deploying, then remove it
    - Option 2: Generate package-lock.json during CI/CD build process
    - Option 3: Use specific version numbers in package.json (no ^ or ~ ranges)
- Always run `npm install` after pulling changes
- Do not modify `node_modules` directly

### Before Committing

Run this checklist:
```bash
# Check what will be committed
git status

# Verify no large directories are staged
git diff --cached --stat

# Ensure node_modules is not included (checks if any node_modules files are tracked)
git ls-files node_modules/ 2>/dev/null | grep -q . && echo "⚠ Warning: node_modules files are tracked!" || echo "✓ No node_modules files tracked"
```

## License

This project is private and proprietary.
