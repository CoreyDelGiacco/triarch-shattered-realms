using System;
using UnityEngine;

namespace Triarch.Playtest
{
    [Serializable]
    public class AuthResponse
    {
        public string token;
        public string expires_at;
        public PlayerProfile player;
    }

    [Serializable]
    public class PlayerProfile
    {
        public int id;
        public string email;
        public string display_name;
    }

    [Serializable]
    public class ErrorResponse
    {
        public ErrorDetail error;
    }

    [Serializable]
    public class ErrorDetail
    {
        public string code;
        public string message;
    }

    [Serializable]
    public class CharacterSummary
    {
        public int id;
        public string name;
        public int faction_id;
        public int class_id;
        public int level;
    }

    [Serializable]
    public class CharacterList
    {
        public CharacterSummary[] characters;
    }

    [Serializable]
    public class ZoneInfo
    {
        public int id;
        public string name;
        public string risk_level;
    }

    [Serializable]
    public class FactionInfo
    {
        public int id;
        public string name;
        public string code;
    }

    [Serializable]
    public class ClassInfo
    {
        public int id;
        public string name;
        public string code;
        public AbilityInfo[] abilities;
    }

    [Serializable]
    public class AbilityInfo
    {
        public int id;
        public string name;
        public string code;
        public string ability_type;
        public int cooldown_seconds;
    }

    [Serializable]
    public class ReferenceList<T>
    {
        public T[] items;
    }

    [Serializable]
    public class WorldStateResponse
    {
        public int character_id;
        public ZoneInfo zone;
        public WorldPosition position;
    }

    [Serializable]
    public class WorldPosition
    {
        public float x;
        public float y;
    }

    [Serializable]
    public class NpcInfo
    {
        public int id;
        public string code;
        public string name;
        public float current_hp;
        public float max_hp;
        public bool is_alive;
    }

    [Serializable]
    public class NpcListResponse
    {
        public int zone_id;
        public NpcInfo[] npcs;
    }

    [Serializable]
    public class CombatResponse
    {
        public CharacterCombatState character;
        public NpcInfo npc;
        public int damage;
        public int retaliated_damage;
    }

    [Serializable]
    public class CharacterCombatState
    {
        public int id;
        public int current_hp;
        public int max_hp;
        public bool is_dead;
    }
}
