# Authentication Stub

This document captures the initial authentication implementation for the vertical slice.

## Goals
- Provide a minimal player account model with email + password.
- Issue a login token that can be used for session validation.
- Keep the system simple and server-authoritative while we build later gameplay features.

## Data Model
- `players`: Stores player identity and password hash.
- `player_sessions`: Stores issued session tokens with expiry timestamps.

## API Endpoints
- `POST /api/auth/register`: Create a new player account.
- `POST /api/auth/login`: Verify credentials and issue a session token.
- `GET /api/auth/me`: Validate a session token and return the player profile.

## Security Notes
- Passwords are hashed with `scrypt` + per-user salt.
- Sessions expire after 24 hours and are stored server-side.
- Rate limiting is applied to register/login endpoints.

## Future Work
- Replace the stub with real auth (email verification, password reset, refresh tokens).
- Add session revocation and device management.
