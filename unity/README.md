# Unity Playtest Client

This Unity client provides a lightweight, animated playtest surface for the Triarch server.

## Requirements
- Unity 2021.3 LTS (AnyRPGCore is built with 2021.3.28f1)
- Triarch server running locally (default `http://localhost:3000`)

## Project Structure

This project uses **AnyRPGCore** as a dependency (located in `../vendor/AnyRPGCore/`).

**Rule**: Do not modify `vendor/AnyRPGCore` files unless absolutely necessary. All Triarch-specific code should live in `Assets/Triarch/`.

## Setup
1. Open Unity Hub and add the `unity/` folder as a project.
2. Import AnyRPGCore packages/assets per their setup documentation (see `../vendor/AnyRPGCore/README.md`).
3. Get a demo scene running first to verify the engine is working.
4. Create a new empty scene for Triarch development.
5. Create an empty GameObject named `PlaytestBootstrap`.
6. Add the `PlaytestBootstrap` component (Assets/Scripts/Playtest/PlaytestBootstrap.cs).
7. Press Play. The UI is generated at runtime.

## Features
- Login/register against the server.
- Load reference data for factions/classes/zones.
- Create characters and enter a zone.
- Fetch NPCs and attack with a simple animation pulse.

> The client is renderer-only; all authoritative logic stays on the server.
