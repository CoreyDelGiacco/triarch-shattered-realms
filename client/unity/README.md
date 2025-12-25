# Unity Playtest Client

This Unity client provides a lightweight, animated playtest surface for the Triarch server.

## Requirements
- Unity 2022.3 LTS
- Triarch server running locally (default `http://localhost:3000`)

## Setup
1. Open Unity Hub and add the `client/unity` folder as a project.
2. Open the project and create a new empty scene.
3. Create an empty GameObject named `PlaytestBootstrap`.
4. Add the `PlaytestBootstrap` component (Assets/Scripts/Playtest/PlaytestBootstrap.cs).
5. Press Play. The UI is generated at runtime.

## Features
- Login/register against the server.
- Load reference data for factions/classes/zones.
- Create characters and enter a zone.
- Fetch NPCs and attack with a simple animation pulse.

> The client is renderer-only; all authoritative logic stays on the server.
