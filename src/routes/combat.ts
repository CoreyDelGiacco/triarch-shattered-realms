import { Router, Request, Response } from "express";
import { z } from "zod";
import { Database } from "../db";
import { requireSession } from "../middleware/auth";
import { createRateLimiter } from "../middleware/rateLimit";
import {
  Character,
  CharacterPosition,
  CharacterState,
  NpcSpawn,
  Zone,
} from "../types";
import { sendError } from "../utils/errors";
import { logSuspiciousAction } from "../utils/securityLog";
import { calculateDeathDrops } from "../utils/loot";

const listNpcsSchema = z.object({
  zoneId: z.coerce.number().int().positive(),
});

const attackSchema = z.object({
  character_id: z.number().int().positive(),
  npc_id: z.number().int().positive(),
  ability_code: z.string().min(2).max(64).optional(),
});

const reviveSchema = z.object({
  character_id: z.number().int().positive(),
});

const parseNumeric = (value: number | string) => Number(value);

const BASE_DAMAGE = 10;
const BASE_ATTACK_RANGE = 12;

const logCombatSuspicious = (
  req: Request,
  playerId: number,
  characterId: number,
  zoneId: number,
  reason: string
) => {
  logSuspiciousAction(req, {
    player_id: playerId,
    character_id: characterId,
    zone_id: zoneId,
    action: "COMBAT",
    reason,
  });
};

export const createCombatRouter = (db: Database) => {
  const router = Router();

  const attackLimiter = createRateLimiter({ windowMs: 30_000, max: 20 });

  router.use(requireSession(db));

  router.get("/npcs/:zoneId", async (req: Request, res: Response) => {
    const parsed = listNpcsSchema.safeParse(req.params);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid zone id.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const { zoneId } = parsed.data;
      const now = new Date();

      const spawnsResult = await pool.query<
        NpcSpawn & {
          template_code: string;
          template_name: string;
          base_hp: number;
          base_damage: number;
        }
      >(
        `SELECT ns.*, nt.code as template_code, nt.name as template_name, nt.base_hp, nt.base_damage
         FROM npc_spawns ns
         JOIN npc_templates nt ON ns.template_id = nt.id
         WHERE ns.zone_id = $1
         ORDER BY ns.id`,
        [zoneId]
      );

      const spawns = [] as Array<{
        id: number;
        code: string;
        name: string;
        zone_id: number;
        position: { x: number; y: number };
        current_hp: number;
        max_hp: number;
        base_damage: number;
        respawn_seconds: number;
        is_alive: boolean;
      }>;

      for (const spawn of spawnsResult.rows) {
        const currentHp = parseNumeric(spawn.current_hp);
        const maxHp = spawn.base_hp;
        const isAlive = currentHp > 0;

        if (!isAlive && spawn.last_defeated_at) {
          const respawnAt = new Date(spawn.last_defeated_at).getTime() + spawn.respawn_seconds * 1000;
          if (now.getTime() >= respawnAt) {
            const updated = await pool.query<NpcSpawn>(
              `UPDATE npc_spawns
               SET current_hp = $1, last_defeated_at = NULL, updated_at = CURRENT_TIMESTAMP
               WHERE id = $2
               RETURNING *`,
              [maxHp, spawn.id]
            );
            const refreshed = updated.rows[0];
            spawns.push({
              id: refreshed.id,
              code: spawn.template_code,
              name: spawn.template_name,
              zone_id: refreshed.zone_id,
              position: {
                x: parseNumeric(refreshed.position_x),
                y: parseNumeric(refreshed.position_y),
              },
              current_hp: parseNumeric(refreshed.current_hp),
              max_hp: maxHp,
              base_damage: spawn.base_damage,
              respawn_seconds: refreshed.respawn_seconds,
              is_alive: parseNumeric(refreshed.current_hp) > 0,
            });
            continue;
          }
        }

        spawns.push({
          id: spawn.id,
          code: spawn.template_code,
          name: spawn.template_name,
          zone_id: spawn.zone_id,
          position: {
            x: parseNumeric(spawn.position_x),
            y: parseNumeric(spawn.position_y),
          },
          current_hp: currentHp,
          max_hp: maxHp,
          base_damage: spawn.base_damage,
          respawn_seconds: spawn.respawn_seconds,
          is_alive: isAlive,
        });
      }

      res.json({
        zone_id: zoneId,
        npcs: spawns,
        server_time: now.toISOString(),
      });
    } catch (error) {
      console.error("Error listing NPCs:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to fetch NPCs.");
    }
  });

  router.post("/attack", attackLimiter, async (req: Request, res: Response) => {
    const parsed = attackSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid combat payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    const { character_id, npc_id, ability_code } = parsed.data;

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const characterResult = await client.query<Character>(
          "SELECT * FROM characters WHERE id = $1 AND player_id = $2",
          [character_id, player.id]
        );
        if (characterResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
          return;
        }
        const character = characterResult.rows[0];

        const stateResult = await client.query<CharacterState>(
          "SELECT * FROM character_state WHERE character_id = $1",
          [character_id]
        );
        if (stateResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_STATE_MISSING", "Character state missing.");
          return;
        }
        const state = stateResult.rows[0];
        if (state.is_dead) {
          await client.query("ROLLBACK");
          sendError(res, 400, "CHARACTER_DEAD", "Character must be revived before fighting.");
          return;
        }

        const positionResult = await client.query<CharacterPosition>(
          "SELECT * FROM character_positions WHERE character_id = $1",
          [character_id]
        );
        if (positionResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "CHARACTER_NOT_IN_WORLD", "Character has no active world state.");
          return;
        }
        const position = positionResult.rows[0];
        const serverPosition = {
          x: parseNumeric(position.position_x),
          y: parseNumeric(position.position_y),
        };

        const npcResult = await client.query<
          NpcSpawn & {
            template_code: string;
            template_name: string;
            base_hp: number;
            base_damage: number;
          }
        >(
          `SELECT ns.*, nt.code as template_code, nt.name as template_name, nt.base_hp, nt.base_damage
           FROM npc_spawns ns
           JOIN npc_templates nt ON ns.template_id = nt.id
           WHERE ns.id = $1`,
          [npc_id]
        );

        if (npcResult.rows.length === 0) {
          await client.query("ROLLBACK");
          sendError(res, 404, "NPC_NOT_FOUND", "NPC not found.");
          return;
        }

        const npc = npcResult.rows[0];
        if (npc.zone_id !== position.zone_id) {
          await client.query("ROLLBACK");
          logCombatSuspicious(req, player.id, character_id, position.zone_id, "ZONE_MISMATCH");
          sendError(res, 400, "INVALID_ZONE", "NPC is not in the same zone.");
          return;
        }

        const npcPosition = {
          x: parseNumeric(npc.position_x),
          y: parseNumeric(npc.position_y),
        };
        const distance = Math.hypot(npcPosition.x - serverPosition.x, npcPosition.y - serverPosition.y);
        if (distance > BASE_ATTACK_RANGE) {
          await client.query("ROLLBACK");
          logCombatSuspicious(req, player.id, character_id, position.zone_id, "OUT_OF_RANGE");
          sendError(res, 400, "OUT_OF_RANGE", "Target is out of range.");
          return;
        }

        let npcCurrentHp = parseNumeric(npc.current_hp);
        if (npcCurrentHp <= 0) {
          if (npc.last_defeated_at) {
            const respawnAt = new Date(npc.last_defeated_at).getTime() + npc.respawn_seconds * 1000;
            if (Date.now() < respawnAt) {
              await client.query("ROLLBACK");
              sendError(res, 400, "NPC_DEFEATED", "NPC is waiting to respawn.");
              return;
            }
          }
          npcCurrentHp = npc.base_hp;
        }

        let abilityModifier = 1;
        let cooldownSeconds = 0;
        let abilityId: number | null = null;

        if (ability_code) {
          const abilityResult = await client.query<
            { id: number; cooldown_seconds: number; damage_modifier: number }
          >(
            `SELECT a.id, a.cooldown_seconds, a.damage_modifier
             FROM abilities a
             JOIN character_abilities ca ON a.id = ca.ability_id
             WHERE ca.character_id = $1 AND a.code = $2`,
            [character_id, ability_code]
          );

          if (abilityResult.rows.length === 0) {
            await client.query("ROLLBACK");
            sendError(res, 400, "ABILITY_NOT_OWNED", "Character does not have this ability.");
            return;
          }

          const ability = abilityResult.rows[0];
          abilityModifier = ability.damage_modifier;
          cooldownSeconds = ability.cooldown_seconds;
          abilityId = ability.id;

          const cooldownResult = await client.query<{ last_used_at: Date }>(
            `SELECT last_used_at
             FROM character_ability_cooldowns
             WHERE character_id = $1 AND ability_id = $2`,
            [character_id, abilityId]
          );

          if (cooldownResult.rows.length > 0) {
            const lastUsed = cooldownResult.rows[0].last_used_at;
            const nextAvailable = new Date(lastUsed).getTime() + cooldownSeconds * 1000;
            if (Date.now() < nextAvailable) {
              await client.query("ROLLBACK");
              sendError(res, 400, "ABILITY_COOLDOWN", "Ability is on cooldown.");
              return;
            }
          }
        }

        const baseDamage = BASE_DAMAGE + character.power * 2;
        const damage = Math.max(1, Math.floor(baseDamage * abilityModifier));
        const npcRemainingHp = Math.max(0, npcCurrentHp - damage);

        await client.query(
          `UPDATE npc_spawns
           SET current_hp = $1,
               last_defeated_at = CASE WHEN $1 = 0 THEN CURRENT_TIMESTAMP ELSE last_defeated_at END,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [npcRemainingHp, npc.id]
        );

        if (abilityId) {
          await client.query(
            `INSERT INTO character_ability_cooldowns (character_id, ability_id, last_used_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP)
             ON CONFLICT (character_id, ability_id)
             DO UPDATE SET last_used_at = EXCLUDED.last_used_at, updated_at = CURRENT_TIMESTAMP`,
            [character_id, abilityId]
          );
        }

        let characterRemainingHp = state.current_hp;
        let deathPayload: {
          dropped_items: Array<{ item_code: string; quantity: number }>;
          loot_container_id: number | null;
        } | null = null;

        if (npcRemainingHp > 0) {
          characterRemainingHp = Math.max(0, state.current_hp - npc.base_damage);

          await client.query(
            `UPDATE character_state
             SET current_hp = $1, is_dead = $2, updated_at = CURRENT_TIMESTAMP
             WHERE character_id = $3`,
            [characterRemainingHp, characterRemainingHp === 0, character_id]
          );
        }

        if (characterRemainingHp === 0) {
          const zoneResult = await client.query<Zone>(
            "SELECT * FROM zones WHERE id = $1",
            [position.zone_id]
          );
          const zone = zoneResult.rows[0];

          const inventoryResult = await client.query<{ item_code: string; quantity: number }>(
            "SELECT item_code, quantity FROM character_inventory WHERE character_id = $1",
            [character_id]
          );

          const { dropped, remaining } = calculateDeathDrops(
            inventoryResult.rows.map((row) => ({
              item_code: row.item_code,
              quantity: row.quantity,
            })),
            zone.loot_drop_on_death
          );

          let lootContainerId: number | null = null;
          if (dropped.length > 0) {
            const containerResult = await client.query<{ id: number }>(
              `INSERT INTO loot_containers (zone_id, position_x, position_y, owner_character_id)
               VALUES ($1, $2, $3, $4)
               RETURNING id`,
              [position.zone_id, serverPosition.x, serverPosition.y, character_id]
            );
            lootContainerId = containerResult.rows[0].id;

            for (const item of dropped) {
              await client.query(
                `INSERT INTO loot_container_items (container_id, item_code, quantity)
                 VALUES ($1, $2, $3)`,
                [lootContainerId, item.item_code, item.quantity]
              );
            }
          }

          await client.query("DELETE FROM character_inventory WHERE character_id = $1", [character_id]);

          for (const item of remaining) {
            await client.query(
              `INSERT INTO character_inventory (character_id, item_code, quantity)
               VALUES ($1, $2, $3)
               ON CONFLICT (character_id, item_code)
               DO UPDATE SET quantity = EXCLUDED.quantity, updated_at = CURRENT_TIMESTAMP`,
              [character_id, item.item_code, item.quantity]
            );
          }

          deathPayload = {
            dropped_items: dropped,
            loot_container_id: lootContainerId,
          };
        }

        await client.query("COMMIT");

        res.json({
          character: {
            id: character.id,
            current_hp: characterRemainingHp,
            max_hp: state.max_hp,
            is_dead: characterRemainingHp === 0,
          },
          npc: {
            id: npc.id,
            code: npc.template_code,
            name: npc.template_name,
            current_hp: npcRemainingHp,
            max_hp: npc.base_hp,
            is_alive: npcRemainingHp > 0,
          },
          damage,
          retaliated_damage: npcRemainingHp > 0 ? npc.base_damage : 0,
          death: deathPayload,
          server_time: new Date().toISOString(),
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      console.error("Error resolving combat:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to resolve combat.");
    }
  });

  router.post("/revive", async (req: Request, res: Response) => {
    const parsed = reviveSchema.safeParse(req.body);
    if (!parsed.success) {
      sendError(res, 400, "INVALID_INPUT", "Invalid revive payload.", parsed.error.flatten().fieldErrors);
      return;
    }

    try {
      const pool = db.getPool();
      const player = res.locals.player as { id: number };
      const { character_id } = parsed.data;

      const characterResult = await pool.query<Character>(
        "SELECT id FROM characters WHERE id = $1 AND player_id = $2",
        [character_id, player.id]
      );
      if (characterResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_NOT_FOUND", "Character not found.");
        return;
      }

      const stateResult = await pool.query<CharacterState>(
        `UPDATE character_state
         SET current_hp = max_hp, is_dead = FALSE, updated_at = CURRENT_TIMESTAMP
         WHERE character_id = $1
         RETURNING *`,
        [character_id]
      );

      if (stateResult.rows.length === 0) {
        sendError(res, 404, "CHARACTER_STATE_MISSING", "Character state missing.");
        return;
      }

      res.json({
        character_id,
        current_hp: stateResult.rows[0].current_hp,
        max_hp: stateResult.rows[0].max_hp,
        is_dead: stateResult.rows[0].is_dead,
      });
    } catch (error) {
      console.error("Error reviving character:", error);
      sendError(res, 500, "INTERNAL_ERROR", "Failed to revive character.");
    }
  });

  return router;
};
