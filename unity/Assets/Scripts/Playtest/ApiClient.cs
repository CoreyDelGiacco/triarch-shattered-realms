using System;
using System.Collections;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;

namespace Triarch.Playtest
{
    public class ApiClient : MonoBehaviour
    {
        [SerializeField] private string baseUrl = "http://localhost:3000";
        [SerializeField] private string sessionToken;

        public string BaseUrl => baseUrl;
        public string SessionToken => sessionToken;

        public void SetSessionToken(string token)
        {
            sessionToken = token;
        }

        public IEnumerator Register(string email, string password, string displayName, Action<string> onResponse)
        {
            var payload = JsonUtility.ToJson(new RegisterRequest
            {
                email = email,
                password = password,
                display_name = displayName
            });

            yield return SendJson("/api/auth/register", payload, onResponse, false);
        }

        public IEnumerator Login(string email, string password, Action<AuthResponse, string> onResponse)
        {
            var payload = JsonUtility.ToJson(new LoginRequest
            {
                email = email,
                password = password
            });

            yield return SendJson("/api/auth/login", payload, raw =>
            {
                if (string.IsNullOrEmpty(raw))
                {
                    onResponse?.Invoke(null, "Empty response");
                    return;
                }

                try
                {
                    var data = JsonUtility.FromJson<AuthResponse>(raw);
                    sessionToken = data.token;
                    onResponse?.Invoke(data, raw);
                }
                catch (Exception ex)
                {
                    onResponse?.Invoke(null, ex.Message);
                }
            }, false);
        }

        public IEnumerator GetFactions(Action<string> onResponse)
        {
            yield return SendGet("/api/factions", onResponse, false);
        }

        public IEnumerator GetClasses(Action<string> onResponse)
        {
            yield return SendGet("/api/classes", onResponse, false);
        }

        public IEnumerator GetSkills(Action<string> onResponse)
        {
            yield return SendGet("/api/skills", onResponse, false);
        }

        public IEnumerator GetZones(Action<string> onResponse)
        {
            yield return SendGet("/api/zones", onResponse, false);
        }

        public IEnumerator GetCharacters(Action<string> onResponse)
        {
            yield return SendGet("/api/characters", onResponse, true);
        }

        public IEnumerator CreateCharacter(string name, int factionId, int classId, Action<string> onResponse)
        {
            var payload = JsonUtility.ToJson(new CreateCharacterRequest
            {
                name = name,
                faction_id = factionId,
                class_id = classId
            });

            yield return SendJson("/api/characters", payload, onResponse, true);
        }

        public IEnumerator AssignAbility(int characterId, int abilityId, Action<string> onResponse)
        {
            var payload = JsonUtility.ToJson(new AssignAbilityRequest
            {
                ability_id = abilityId
            });

            yield return SendJson($"/api/characters/{characterId}/abilities", payload, onResponse, true);
        }

        public IEnumerator TrainSkill(int characterId, int skillId, int experience, Action<string> onResponse)
        {
            var payload = JsonUtility.ToJson(new TrainSkillRequest
            {
                skill_id = skillId,
                experience_gained = experience
            });

            yield return SendJson($"/api/characters/{characterId}/skills", payload, onResponse, true);
        }

        public IEnumerator EnterZone(int characterId, int zoneId, Vector2 position, Action<string> onResponse)
        {
            var payload = JsonUtility.ToJson(new ZoneEnterRequest
            {
                character_id = characterId,
                zone_id = zoneId,
                position = new PositionRequest { x = position.x, y = position.y }
            });

            yield return SendJson("/api/world/zone-enter", payload, onResponse, true);
        }

        public IEnumerator GetWorldState(int characterId, Action<string> onResponse)
        {
            yield return SendGet($"/api/world/state/{characterId}", onResponse, true);
        }

        public IEnumerator GetNpcList(int zoneId, Action<string> onResponse)
        {
            yield return SendGet($"/api/combat/npcs/{zoneId}", onResponse, true);
        }

        public IEnumerator AttackNpc(int characterId, int npcId, string abilityCode, Action<string> onResponse)
        {
            var payload = JsonUtility.ToJson(new CombatRequest
            {
                character_id = characterId,
                npc_id = npcId,
                ability_code = string.IsNullOrEmpty(abilityCode) ? null : abilityCode
            });

            yield return SendJson("/api/combat/attack", payload, onResponse, true);
        }

        private IEnumerator SendGet(string route, Action<string> onResponse, bool auth)
        {
            using var request = UnityWebRequest.Get(baseUrl + route);
            if (auth && !string.IsNullOrEmpty(sessionToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {sessionToken}");
            }
            yield return request.SendWebRequest();
            onResponse?.Invoke(request.downloadHandler.text);
        }

        private IEnumerator SendJson(string route, string payload, Action<string> onResponse, bool auth)
        {
            using var request = new UnityWebRequest(baseUrl + route, "POST");
            var body = Encoding.UTF8.GetBytes(payload);
            request.uploadHandler = new UploadHandlerRaw(body);
            request.downloadHandler = new DownloadHandlerBuffer();
            request.SetRequestHeader("Content-Type", "application/json");
            if (auth && !string.IsNullOrEmpty(sessionToken))
            {
                request.SetRequestHeader("Authorization", $"Bearer {sessionToken}");
            }

            yield return request.SendWebRequest();
            onResponse?.Invoke(request.downloadHandler.text);
        }

        [Serializable]
        private class RegisterRequest
        {
            public string email;
            public string password;
            public string display_name;
        }

        [Serializable]
        private class LoginRequest
        {
            public string email;
            public string password;
        }

        [Serializable]
        private class CreateCharacterRequest
        {
            public string name;
            public int faction_id;
            public int class_id;
        }

        [Serializable]
        private class AssignAbilityRequest
        {
            public int ability_id;
        }

        [Serializable]
        private class TrainSkillRequest
        {
            public int skill_id;
            public int experience_gained;
        }

        [Serializable]
        private class ZoneEnterRequest
        {
            public int character_id;
            public int zone_id;
            public PositionRequest position;
        }

        [Serializable]
        private class PositionRequest
        {
            public float x;
            public float y;
        }

        [Serializable]
        private class CombatRequest
        {
            public int character_id;
            public int npc_id;
            public string ability_code;
        }
    }
}
