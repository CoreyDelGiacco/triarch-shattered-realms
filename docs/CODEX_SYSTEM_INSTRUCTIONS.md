# Codex System Instructions

## Project Overview

You are implementing a mobile MMORPG vertical slice ("Triarch: Shattered Realms").

**Key Principles:**
- Server is authoritative. Unity is a thin client.
- Never add complexity without a test or a clear reason.
- Prefer boring, reliable tech: Node + Express, Postgres

## Architecture

- **Server**: Node.js + Express + PostgreSQL (authoritative)
- **Client**: Unity (thin client that calls server endpoints and renders state)
- **Data**: JSON-based Single Source of Truth in `data/` directory
- **Database**: PostgreSQL with migrations in `migrations/` directory

## Server Authority

The server is authoritative for:
- Zone membership
- Combat resolution rules
- Loot/death rules
- Gathering cooldowns
- All game state and business logic

Unity should only:
- Render UI and scenes
- Call server endpoints
- Display server state

## Requirements for Every Change

Every change must include:
1. **Exact files changed** (full contents when applicable)
2. **Exact commands to run** for testing and validation
3. **At least one test** when behavior changes
4. **No breaking changes** to existing functionality

## Technology Stack

- **Runtime**: Node.js >= 20
- **Language**: TypeScript (strict mode)
- **Web Framework**: Express
- **Database**: PostgreSQL 16
- **ORM**: None (use raw SQL via `pg` driver)
- **Validation**: Zod for runtime validation
- **Testing**: Vitest
- **Dev Tools**: tsx for development

## Database Guidelines

- **Migrations are mandatory** - never modify the database schema without a migration
- All migrations go in `migrations/` directory, numbered sequentially
- Use raw SQL for migrations (e.g., `001_init.sql`, `002_factions.sql`)
- Run migrations with: `npm run migrate`

## Game Data Guidelines

- All game data (items, zones, factions, classes, etc.) lives in `data/` as JSON
- Data schemas are defined in `src/data/gameData.ts` using Zod
- Game data is validated at server startup
- **The server must crash fast if game data is invalid**
- Never hardcode game logic in Unity or server code that should be in data files

## Definition of Done

For each task, you must ensure:
1. ✅ `npm run test` passes
2. ✅ Server boots from scratch with `docker compose up -d` + `npm run migrate` + `npm run dev`
3. ✅ `/health` endpoint returns 200 OK
4. ✅ No console errors or warnings
5. ✅ Game data validates successfully at startup

## Boot Sequence

The standard boot sequence is:

```bash
# 1. Start PostgreSQL
docker compose up -d

# 2. Install dependencies
npm install

# 3. Run migrations
npm run migrate

# 4. Run tests
npm run test

# 5. Start dev server
npm run dev

# 6. Verify health
curl http://localhost:3000/health
# Expected: {"status":"ok","db":"ok"}
```

## Testing Guidelines

- Use Vitest for all tests
- Tests go in `tests/` directory
- Use `supertest` for API endpoint testing
- Mock the database with `SKIP_DB=true` for unit tests
- Always test both success and error cases
- Run tests with: `npm run test`

## Code Style

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use async/await over callbacks
- Use Zod for runtime validation
- Keep functions small and focused
- Write self-documenting code with clear variable names

## Common Commands

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Build for production
npm start            # Run production build

# Database
npm run migrate      # Run migrations
npm run seed         # Seed initial data

# Testing
npm test             # Run all tests
```

## Error Handling

- Always validate input with Zod schemas
- Return appropriate HTTP status codes (400 for client errors, 500 for server errors)
- Log errors to console with enough context for debugging
- Never expose internal error details to clients

## API Design

- Use RESTful conventions
- Prefix all API routes with `/api/`
- Use appropriate HTTP methods (GET, POST, PUT, DELETE)
- Validate request bodies with Zod
- Return JSON responses
- Include appropriate status codes

## Git Workflow

- Make small, focused commits
- Write clear commit messages
- Don't commit `node_modules/`, `.env`, or build artifacts
- Use `.gitignore` to exclude generated files

## Next Tasks

After confirming the boot sequence works, the next priorities are:

1. **Auth becomes real** (still minimal):
   - Register/login endpoints (already implemented)
   - JWT or session token management
   - GET /auth/me endpoint

2. **Character create + enter zone**:
   - Create character with faction + class
   - List zones
   - Enter zone (server stores character state)

## Single Source of Truth (SSOT) for Game Data

The `data/` directory contains all game configuration:

- `data/items.json` - Item definitions
- `data/zones.json` - Zone configurations
- `data/factions.json` - Faction data
- `data/classes.json` - Class definitions
- `data/abilities.json` - Ability definitions
- `data/nodes.json` - Resource gathering nodes

These files are:
- Validated at server startup using Zod schemas
- Used by the server for all game logic
- Never modified at runtime
- The single source of truth for game balance and configuration

## Example Task Format

When giving me a task, use this format:

```
Task: Implement character deletion endpoint

Requirements:
- Add DELETE /api/characters/:id endpoint
- Verify character belongs to authenticated user
- Soft delete (mark as deleted, don't remove from DB)
- Return 204 No Content on success

Acceptance Criteria:
- npm run test passes
- New test covers both success and unauthorized cases
- Server boots without errors
```

## Remember

- **Never restart** - iterate on what's already here
- **Test everything** - no untested code
- **Keep it simple** - boring is good
- **Server is authoritative** - Unity is just a view
- **Data drives behavior** - not hardcoded logic
