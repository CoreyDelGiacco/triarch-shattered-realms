using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using UnityEngine;
using UnityEngine.UI;

namespace Triarch.Playtest
{
    public class PlaytestBootstrap : MonoBehaviour
    {
        [SerializeField] private ApiClient apiClient;
        [SerializeField] private GameObject playerAvatar;
        [SerializeField] private GameObject targetNpc;

        private readonly List<CharacterSummary> characters = new();
        private readonly List<FactionInfo> factions = new();
        private readonly List<ClassInfo> classes = new();
        private readonly List<ZoneInfo> zones = new();
        private readonly List<AbilityInfo> abilities = new();
        private readonly List<NpcInfo> npcs = new();

        private int currentCharacterId;
        private int currentZoneId;

        private Text output;
        private Dropdown factionDropdown;
        private Dropdown classDropdown;
        private Dropdown characterDropdown;
        private Dropdown zoneDropdown;
        private Dropdown abilityDropdown;
        private Dropdown npcDropdown;
        private InputField emailField;
        private InputField passwordField;
        private InputField displayNameField;
        private InputField characterNameField;

        private void Awake()
        {
            if (apiClient == null)
            {
                apiClient = gameObject.AddComponent<ApiClient>();
            }
        }

        private void Start()
        {
            BuildUi();
            SpawnActors();
        }

        private void BuildUi()
        {
            var canvas = new GameObject("PlaytestCanvas", typeof(Canvas), typeof(CanvasScaler), typeof(GraphicRaycaster));
            var canvasComp = canvas.GetComponent<Canvas>();
            canvasComp.renderMode = RenderMode.ScreenSpaceOverlay;
            var scaler = canvas.GetComponent<CanvasScaler>();
            scaler.uiScaleMode = CanvasScaler.ScaleMode.ScaleWithScreenSize;
            scaler.referenceResolution = new Vector2(1280, 720);

            var panel = new GameObject("Panel", typeof(Image));
            panel.transform.SetParent(canvas.transform, false);
            var panelImage = panel.GetComponent<Image>();
            panelImage.color = new Color(0.08f, 0.08f, 0.12f, 0.85f);
            var panelRect = panel.GetComponent<RectTransform>();
            panelRect.anchorMin = new Vector2(0.02f, 0.02f);
            panelRect.anchorMax = new Vector2(0.4f, 0.98f);
            panelRect.offsetMin = Vector2.zero;
            panelRect.offsetMax = Vector2.zero;

            var layout = panel.AddComponent<VerticalLayoutGroup>();
            layout.padding = new RectOffset(12, 12, 12, 12);
            layout.spacing = 8;

            var header = CreateText("Triarch Playtest", panel.transform, 18, FontStyle.Bold);
            header.alignment = TextAnchor.MiddleLeft;

            emailField = CreateInput("Email", panel.transform);
            passwordField = CreateInput("Password", panel.transform);
            passwordField.contentType = InputField.ContentType.Password;
            displayNameField = CreateInput("Display Name", panel.transform);

            var authRow = CreateHorizontal(panel.transform);
            CreateButton("Register", authRow, () => StartCoroutine(HandleRegister()));
            CreateButton("Login", authRow, () => StartCoroutine(HandleLogin()));

            CreateDivider(panel.transform);

            CreateButton("Load Reference Data", panel.transform, () => StartCoroutine(LoadReferenceData()));

            factionDropdown = CreateDropdown("Faction", panel.transform);
            classDropdown = CreateDropdown("Class", panel.transform);
            characterNameField = CreateInput("Character Name", panel.transform);
            CreateButton("Create Character", panel.transform, () => StartCoroutine(CreateCharacter()));

            characterDropdown = CreateDropdown("Characters", panel.transform);
            characterDropdown.onValueChanged.AddListener(_ => SelectCharacter());

            zoneDropdown = CreateDropdown("Zone", panel.transform);
            CreateButton("Enter Zone", panel.transform, () => StartCoroutine(EnterZone()));
            CreateButton("World State", panel.transform, () => StartCoroutine(GetWorldState()));

            abilityDropdown = CreateDropdown("Ability", panel.transform);
            npcDropdown = CreateDropdown("Target NPC", panel.transform);
            CreateButton("Attack", panel.transform, () => StartCoroutine(AttackNpc()));

            output = CreateText("Output", panel.transform, 12, FontStyle.Normal);
            output.alignment = TextAnchor.UpperLeft;
            output.horizontalOverflow = HorizontalWrapMode.Wrap;
            output.verticalOverflow = VerticalWrapMode.Overflow;
            output.text = "Ready.";
        }

        private void SpawnActors()
        {
            playerAvatar = GameObject.CreatePrimitive(PrimitiveType.Capsule);
            playerAvatar.name = "PlayerAvatar";
            playerAvatar.transform.position = new Vector3(0, 0.5f, 0);
            playerAvatar.AddComponent<SimpleAnimator>().Configure(Color.cyan);

            targetNpc = GameObject.CreatePrimitive(PrimitiveType.Cube);
            targetNpc.name = "NpcTarget";
            targetNpc.transform.position = new Vector3(3f, 0.5f, 0);
            targetNpc.AddComponent<SimpleAnimator>().Configure(Color.red);
        }

        private IEnumerator HandleRegister()
        {
            yield return apiClient.Register(emailField.text, passwordField.text, displayNameField.text, raw =>
            {
                output.text = raw;
            });
        }

        private IEnumerator HandleLogin()
        {
            yield return apiClient.Login(emailField.text, passwordField.text, (data, raw) =>
            {
                output.text = raw;
            });
        }

        private IEnumerator LoadReferenceData()
        {
            yield return apiClient.GetFactions(raw =>
            {
                factions.Clear();
                try
                {
                    var data = JsonArrayUtility.FromJson<FactionInfo>(raw);
                    factions.AddRange(data);
                    UpdateDropdown(factionDropdown, factions.Select(f => f.name).ToList());
                }
                catch (Exception ex)
                {
                    output.text = ex.Message;
                }
            });

            yield return apiClient.GetClasses(raw =>
            {
                classes.Clear();
                try
                {
                    var data = JsonArrayUtility.FromJson<ClassInfo>(raw);
                    classes.AddRange(data);
                    UpdateDropdown(classDropdown, classes.Select(c => c.name).ToList());
                    if (classes.Count > 0)
                    {
                        abilities.Clear();
                        abilities.AddRange(classes[0].abilities ?? Array.Empty<AbilityInfo>());
                        UpdateDropdown(abilityDropdown, abilities.Select(a => a.code).ToList());
                    }
                }
                catch (Exception ex)
                {
                    output.text = ex.Message;
                }
            });

            yield return apiClient.GetZones(raw =>
            {
                zones.Clear();
                try
                {
                    var data = JsonArrayUtility.FromJson<ZoneInfo>(raw);
                    zones.AddRange(data);
                    UpdateDropdown(zoneDropdown, zones.Select(z => z.name).ToList());
                }
                catch (Exception ex)
                {
                    output.text = ex.Message;
                }
            });

            output.text = "Reference data loaded.";
        }

        private IEnumerator CreateCharacter()
        {
            if (factions.Count == 0 || classes.Count == 0)
            {
                output.text = "Load reference data first.";
                yield break;
            }

            var faction = factions[Mathf.Clamp(factionDropdown.value, 0, factions.Count - 1)];
            var chosenClass = classes[Mathf.Clamp(classDropdown.value, 0, classes.Count - 1)];

            yield return apiClient.CreateCharacter(characterNameField.text, faction.id, chosenClass.id, raw =>
            {
                output.text = raw;
            });

            yield return StartCoroutine(RefreshCharacters());
        }

        private IEnumerator RefreshCharacters()
        {
            yield return apiClient.GetCharacters(raw =>
            {
                characters.Clear();
                try
                {
                    var data = JsonArrayUtility.FromJson<CharacterSummary>(raw);
                    characters.AddRange(data);
                    UpdateDropdown(characterDropdown, characters.Select(c => c.name).ToList());
                    SelectCharacter();
                }
                catch (Exception ex)
                {
                    output.text = ex.Message;
                }
            });
        }

        private void SelectCharacter()
        {
            if (characters.Count == 0) return;
            currentCharacterId = characters[Mathf.Clamp(characterDropdown.value, 0, characters.Count - 1)].id;
        }

        private IEnumerator EnterZone()
        {
            if (zones.Count == 0)
            {
                output.text = "Load reference data first.";
                yield break;
            }

            var zone = zones[Mathf.Clamp(zoneDropdown.value, 0, zones.Count - 1)];
            currentZoneId = zone.id;

            yield return apiClient.EnterZone(currentCharacterId, zone.id, new Vector2(100, 100), raw =>
            {
                output.text = raw;
            });
        }

        private IEnumerator GetWorldState()
        {
            yield return apiClient.GetWorldState(currentCharacterId, raw =>
            {
                output.text = raw;
            });
        }

        private IEnumerator AttackNpc()
        {
            if (currentZoneId == 0)
            {
                output.text = "Enter a zone first.";
                yield break;
            }

            if (npcs.Count == 0)
            {
                yield return apiClient.GetNpcList(currentZoneId, raw =>
                {
                    try
                    {
                        var data = JsonUtility.FromJson<NpcListResponse>(raw);
                        npcs.Clear();
                        if (data != null && data.npcs != null)
                        {
                            npcs.AddRange(data.npcs);
                            UpdateDropdown(npcDropdown, npcs.Select(n => n.name).ToList());
                        }
                    }
                    catch (Exception ex)
                    {
                        output.text = ex.Message;
                    }
                });
            }

            if (npcs.Count == 0)
            {
                output.text = "No NPCs found.";
                yield break;
            }

            var npc = npcs[Mathf.Clamp(npcDropdown.value, 0, npcs.Count - 1)];
            var abilityCode = abilities.Count > 0 && abilityDropdown.value < abilities.Count
                ? abilities[abilityDropdown.value].code
                : string.Empty;

            yield return apiClient.AttackNpc(currentCharacterId, npc.id, abilityCode, raw =>
            {
                output.text = raw;
                var animator = playerAvatar.GetComponent<SimpleAnimator>();
                animator.PlayAttack();
            });
        }

        private static void UpdateDropdown(Dropdown dropdown, List<string> options)
        {
            dropdown.ClearOptions();
            dropdown.AddOptions(options);
        }

        private static HorizontalLayoutGroup CreateHorizontal(Transform parent)
        {
            var row = new GameObject("Row", typeof(RectTransform));
            row.transform.SetParent(parent, false);
            var layout = row.AddComponent<HorizontalLayoutGroup>();
            layout.spacing = 8;
            layout.childForceExpandHeight = false;
            layout.childForceExpandWidth = false;
            return layout;
        }

        private static void CreateDivider(Transform parent)
        {
            var divider = new GameObject("Divider", typeof(Image));
            divider.transform.SetParent(parent, false);
            var image = divider.GetComponent<Image>();
            image.color = new Color(1f, 1f, 1f, 0.1f);
            var rect = divider.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 2);
        }

        private static Text CreateText(string content, Transform parent, int size, FontStyle style)
        {
            var obj = new GameObject("Text", typeof(Text));
            obj.transform.SetParent(parent, false);
            var text = obj.GetComponent<Text>();
            text.font = Resources.GetBuiltinResource<Font>("Arial.ttf");
            text.fontSize = size;
            text.fontStyle = style;
            text.color = Color.white;
            text.text = content;
            return text;
        }

        private static InputField CreateInput(string placeholder, Transform parent)
        {
            var container = new GameObject($"{placeholder}_Container", typeof(RectTransform));
            container.transform.SetParent(parent, false);

            var background = new GameObject("Background", typeof(Image));
            background.transform.SetParent(container.transform, false);
            var bgImage = background.GetComponent<Image>();
            bgImage.color = new Color(0.2f, 0.2f, 0.25f, 0.9f);
            var bgRect = background.GetComponent<RectTransform>();
            bgRect.anchorMin = Vector2.zero;
            bgRect.anchorMax = Vector2.one;
            bgRect.offsetMin = Vector2.zero;
            bgRect.offsetMax = Vector2.zero;

            var inputObj = new GameObject("InputField", typeof(InputField));
            inputObj.transform.SetParent(container.transform, false);
            var input = inputObj.GetComponent<InputField>();
            input.textComponent = CreateText("", inputObj.transform, 12, FontStyle.Normal);
            input.placeholder = CreateText(placeholder, inputObj.transform, 12, FontStyle.Italic);
            input.textComponent.color = Color.white;
            input.placeholder.color = new Color(1f, 1f, 1f, 0.5f);
            input.textComponent.alignment = TextAnchor.MiddleLeft;
            input.placeholder.alignment = TextAnchor.MiddleLeft;
            inputObj.GetComponent<RectTransform>().sizeDelta = new Vector2(0, 28);
            return input;
        }

        private static Dropdown CreateDropdown(string label, Transform parent)
        {
            var container = new GameObject($"{label}_Container", typeof(RectTransform));
            container.transform.SetParent(parent, false);
            CreateText(label, container.transform, 12, FontStyle.Normal);

            var dropdownObj = new GameObject($"{label}_Dropdown", typeof(Dropdown), typeof(Image));
            dropdownObj.transform.SetParent(container.transform, false);
            var dropdown = dropdownObj.GetComponent<Dropdown>();
            dropdown.captionText = CreateText(label, dropdownObj.transform, 12, FontStyle.Normal);
            dropdown.captionText.alignment = TextAnchor.MiddleLeft;
            dropdown.template = CreateDropdownTemplate(dropdownObj.transform);
            dropdown.options = new List<Dropdown.OptionData> { new Dropdown.OptionData("...") };
            dropdownObj.GetComponent<RectTransform>().sizeDelta = new Vector2(0, 30);
            return dropdown;
        }

        private static RectTransform CreateDropdownTemplate(Transform parent)
        {
            var template = new GameObject("Template", typeof(RectTransform), typeof(Image));
            template.transform.SetParent(parent, false);
            template.SetActive(false);

            var viewport = new GameObject("Viewport", typeof(RectTransform), typeof(Mask), typeof(Image));
            viewport.transform.SetParent(template.transform, false);
            var viewportImage = viewport.GetComponent<Image>();
            viewportImage.color = new Color(0f, 0f, 0f, 0.8f);

            var content = new GameObject("Content", typeof(RectTransform));
            content.transform.SetParent(viewport.transform, false);
            var layout = content.AddComponent<VerticalLayoutGroup>();
            layout.childControlHeight = true;
            layout.childForceExpandHeight = false;

            var item = new GameObject("Item", typeof(Toggle), typeof(RectTransform));
            item.transform.SetParent(content.transform, false);
            var itemText = CreateText("Option", item.transform, 12, FontStyle.Normal);
            itemText.alignment = TextAnchor.MiddleLeft;

            var toggle = item.GetComponent<Toggle>();
            toggle.targetGraphic = item.AddComponent<Image>();
            toggle.graphic = itemText;

            var templateRect = template.GetComponent<RectTransform>();
            templateRect.anchorMin = new Vector2(0, 0);
            templateRect.anchorMax = new Vector2(1, 0);
            templateRect.pivot = new Vector2(0.5f, 1f);
            templateRect.sizeDelta = new Vector2(0, 150);

            var viewportRect = viewport.GetComponent<RectTransform>();
            viewportRect.anchorMin = Vector2.zero;
            viewportRect.anchorMax = Vector2.one;
            viewportRect.offsetMin = Vector2.zero;
            viewportRect.offsetMax = Vector2.zero;

            var contentRect = content.GetComponent<RectTransform>();
            contentRect.anchorMin = new Vector2(0, 1);
            contentRect.anchorMax = new Vector2(1, 1);
            contentRect.pivot = new Vector2(0.5f, 1f);

            var itemRect = item.GetComponent<RectTransform>();
            itemRect.sizeDelta = new Vector2(0, 24);

            return templateRect;
        }

        private static Button CreateButton(string label, Transform parent, Action onClick)
        {
            var buttonObj = new GameObject(label, typeof(Button), typeof(Image));
            buttonObj.transform.SetParent(parent, false);
            var image = buttonObj.GetComponent<Image>();
            image.color = new Color(0.35f, 0.35f, 0.8f, 1f);
            var text = CreateText(label, buttonObj.transform, 12, FontStyle.Bold);
            text.alignment = TextAnchor.MiddleCenter;
            var rect = buttonObj.GetComponent<RectTransform>();
            rect.sizeDelta = new Vector2(0, 28);
            var button = buttonObj.GetComponent<Button>();
            button.onClick.AddListener(() => onClick?.Invoke());
            return button;
        }
    }

    public class SimpleAnimator : MonoBehaviour
    {
        private float time;
        private Renderer cachedRenderer;
        private Color baseColor;
        private bool attackPulse;

        public void Configure(Color color)
        {
            cachedRenderer = GetComponent<Renderer>();
            baseColor = color;
            if (cachedRenderer != null)
            {
                cachedRenderer.material.color = color;
            }
        }

        public void PlayAttack()
        {
            attackPulse = true;
            time = 0f;
        }

        private void Update()
        {
            time += Time.deltaTime;
            var bob = Mathf.Sin(time * 2f) * 0.1f;
            transform.position = new Vector3(transform.position.x, 0.5f + bob, transform.position.z);

            if (attackPulse && cachedRenderer != null)
            {
                var pulse = Mathf.PingPong(time * 6f, 1f);
                cachedRenderer.material.color = Color.Lerp(baseColor, Color.yellow, pulse);
                if (time > 0.5f)
                {
                    cachedRenderer.material.color = baseColor;
                    attackPulse = false;
                }
            }
        }
    }

    public static class JsonArrayUtility
    {
        public static T[] FromJson<T>(string json)
        {
            var wrapper = JsonUtility.FromJson<ArrayWrapper<T>>($"{{\"items\":{json}}}");
            return wrapper.items ?? Array.Empty<T>();
        }

        [Serializable]
        private class ArrayWrapper<T>
        {
            public T[] items;
        }
    }
}
