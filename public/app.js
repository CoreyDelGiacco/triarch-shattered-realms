const STORAGE_KEY = "triarch.session.token";

let sessionToken = localStorage.getItem(STORAGE_KEY) ?? "";
let selectedCharacterId = null;
const referenceData = {
  factions: [],
  classes: [],
  skills: [],
  zones: [],
};
const classDetails = new Map();

const tokenPreview = document.getElementById("tokenPreview");

tokenPreview.textContent = sessionToken ? `${sessionToken.slice(0, 12)}...` : "not set";

const setOutput = (id, payload) => {
  const el = document.getElementById(id);
  el.textContent = JSON.stringify(payload, null, 2);
};

const apiFetch = async (url, options = {}) => {
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (sessionToken) {
    headers.Authorization = `Bearer ${sessionToken}`;
  }

  const response = await fetch(url, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
};

const ensureToken = () => {
  if (!sessionToken) {
    setOutput("authOutput", {
      error: "Login required",
      message: "Please log in and make sure a session token is set.",
    });
    return false;
  }
  return true;
};

const getSelectedCharacterId = () => {
  if (selectedCharacterId) {
    return selectedCharacterId;
  }
  return null;
};

const ensureCharacter = () => {
  const characterId = getSelectedCharacterId();
  if (!characterId) {
    setOutput("charactersOutput", {
      error: "No character selected",
      message: "Pick a character from the dropdown or create one first.",
    });
    return null;
  }
  return characterId;
};

const populateSelect = (elementId, options, formatter, placeholder = "Select...") => {
  const select = document.getElementById(elementId);
  select.innerHTML = "";
  const placeholderOption = document.createElement("option");
  placeholderOption.value = "";
  placeholderOption.textContent = placeholder;
  select.appendChild(placeholderOption);

  for (const option of options) {
    const el = document.createElement("option");
    el.value = String(option.value);
    el.textContent = option.label;
    select.appendChild(el);
  }
};

const refreshReferenceSelects = () => {
  populateSelect(
    "characterFaction",
    referenceData.factions.map((faction) => ({
      value: faction.id,
      label: `${faction.name} (${faction.code})`,
    })),
    null,
    "Select faction"
  );

  populateSelect(
    "characterClass",
    referenceData.classes.map((entry) => ({
      value: entry.id,
      label: `${entry.name} (${entry.code})`,
    })),
    null,
    "Select class"
  );

  populateSelect(
    "skillSelect",
    referenceData.skills.map((skill) => ({
      value: skill.id,
      label: `${skill.name} (${skill.code})`,
    })),
    null,
    "Select skill"
  );

  populateSelect(
    "zoneId",
    referenceData.zones.map((zone) => ({
      value: zone.id,
      label: `${zone.name} (${zone.risk_level})`,
    })),
    null,
    "Select zone"
  );

  populateSelect(
    "betrayalTarget",
    referenceData.factions.map((faction) => ({
      value: faction.id,
      label: `${faction.name} (${faction.code})`,
    })),
    null,
    "Select target faction"
  );
};

const updateAbilitySelects = (abilities) => {
  populateSelect(
    "abilitySelect",
    abilities.map((ability) => ({
      value: ability.id,
      label: `${ability.name} (${ability.code})`,
    })),
    null,
    "Select ability"
  );

  populateSelect(
    "abilityCode",
    [{ value: "", label: "Basic attack" }].concat(
      abilities.map((ability) => ({
        value: ability.code,
        label: `${ability.name} (${ability.code})`,
      }))
    ),
    null,
    "Basic attack"
  );
};

const updateCharacterSelect = (characters) => {
  const options = characters.map((character) => ({
    value: character.id,
    label: `${character.name} (Lv ${character.level})`,
  }));
  populateSelect("selectedCharacter", options, null, "Select character");

  if (options.length > 0) {
    selectedCharacterId = Number(options[0].value);
    document.getElementById("selectedCharacter").value = String(selectedCharacterId);
  }
};

const updateNodeSelect = (nodes) => {
  populateSelect(
    "nodeCode",
    nodes.map((node) => ({
      value: node.code,
      label: `${node.name} (${node.code})`,
    })),
    null,
    "Select node"
  );
};

const updateNpcSelect = (npcs) => {
  populateSelect(
    "npcId",
    npcs.map((npc) => ({
      value: npc.id,
      label: `${npc.name} (${npc.code})`,
    })),
    null,
    "Select NPC"
  );
};

const updateLootSelect = (containers) => {
  populateSelect(
    "containerId",
    containers.map((container) => ({
      value: container.id,
      label: `Container #${container.id}`,
    })),
    null,
    "Select container"
  );
};

const loadReferenceData = async () => {
  const [factionsRes, classesRes, skillsRes, zonesRes] = await Promise.all([
    apiFetch("/api/factions"),
    apiFetch("/api/classes"),
    apiFetch("/api/skills"),
    apiFetch("/api/zones"),
  ]);

  if (factionsRes.ok) referenceData.factions = factionsRes.data;
  if (classesRes.ok) referenceData.classes = classesRes.data;
  if (skillsRes.ok) referenceData.skills = skillsRes.data;
  if (zonesRes.ok) referenceData.zones = zonesRes.data;

  refreshReferenceSelects();
  setOutput("referenceOutput", {
    factions: factionsRes.data,
    classes: classesRes.data,
    skills: skillsRes.data,
    zones: zonesRes.data,
  });
};

document.getElementById("registerBtn").addEventListener("click", async () => {
  const payload = {
    email: document.getElementById("registerEmail").value,
    password: document.getElementById("registerPassword").value,
    display_name: document.getElementById("registerDisplay").value,
  };

  const result = await apiFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("authOutput", result);
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  const payload = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };

  const result = await apiFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (result.ok) {
    sessionToken = result.data.token;
    localStorage.setItem(STORAGE_KEY, sessionToken);
    tokenPreview.textContent = `${sessionToken.slice(0, 12)}...`;
  }

  setOutput("authOutput", result);
});

document.getElementById("clearTokenBtn").addEventListener("click", () => {
  sessionToken = "";
  localStorage.removeItem(STORAGE_KEY);
  tokenPreview.textContent = "not set";
});

document.getElementById("loadReferenceBtn").addEventListener("click", loadReferenceData);

document.getElementById("characterClass").addEventListener("change", async (event) => {
  const classId = event.target.value;
  if (!classId) {
    updateAbilitySelects([]);
    return;
  }

  if (classDetails.has(classId)) {
    updateAbilitySelects(classDetails.get(classId).abilities ?? []);
    return;
  }

  const result = await apiFetch(`/api/classes/${classId}`);
  if (result.ok) {
    classDetails.set(classId, result.data);
    updateAbilitySelects(result.data.abilities ?? []);
  } else {
    setOutput("referenceOutput", result);
  }
});

document.getElementById("createCharacterBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;

  const factionId = Number(document.getElementById("characterFaction").value);
  const classId = Number(document.getElementById("characterClass").value);

  const payload = {
    name: document.getElementById("characterName").value,
    faction_id: factionId,
    class_id: classId,
  };

  const result = await apiFetch("/api/characters", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setOutput("charactersOutput", result);
});

document.getElementById("listCharactersBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;

  const result = await apiFetch("/api/characters");
  if (result.ok && Array.isArray(result.data)) {
    updateCharacterSelect(result.data);
  }
  setOutput("charactersOutput", result);
});

document.getElementById("selectedCharacter").addEventListener("change", (event) => {
  selectedCharacterId = event.target.value ? Number(event.target.value) : null;
});

document.getElementById("trainSkillBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const skillId = Number(document.getElementById("skillSelect").value);
  const experience = Number(document.getElementById("skillExp").value);
  const payload = {
    skill_id: skillId,
    experience_gained: experience,
  };

  const result = await apiFetch(`/api/characters/${characterId}/skills`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setOutput("setupOutput", result);
});

document.getElementById("assignAbilityBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const abilityId = Number(document.getElementById("abilitySelect").value);
  const payload = { ability_id: abilityId };

  const result = await apiFetch(`/api/characters/${characterId}/abilities`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setOutput("setupOutput", result);
});

document.getElementById("zoneEnterBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const zoneId = Number(document.getElementById("zoneId").value);
  const payload = {
    character_id: characterId,
    zone_id: zoneId,
    position: {
      x: Number(document.getElementById("positionX").value),
      y: Number(document.getElementById("positionY").value),
    },
  };

  const result = await apiFetch("/api/world/zone-enter", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("worldOutput", result);
});

document.getElementById("worldStateBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const result = await apiFetch(`/api/world/state/${characterId}`);
  setOutput("worldOutput", result);
});

document.getElementById("inventoryBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const result = await apiFetch(`/api/inventory/${characterId}`);
  setOutput("inventoryOutput", result);
});

document.getElementById("addItemBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const payload = {
    item_code: document.getElementById("addItemCode").value,
    quantity: Number(document.getElementById("addItemQty").value),
  };

  const result = await apiFetch(`/api/inventory/${characterId}/add`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setOutput("inventoryOutput", result);
});

document.getElementById("removeItemBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const payload = {
    item_code: document.getElementById("removeItemCode").value,
    quantity: Number(document.getElementById("removeItemQty").value),
  };

  const result = await apiFetch(`/api/inventory/${characterId}/remove`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

  setOutput("inventoryOutput", result);
});

document.getElementById("listNodesBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const zoneId = Number(document.getElementById("zoneId").value);
  const result = await apiFetch(`/api/gathering/nodes/${zoneId}`);

  if (result.ok) {
    updateNodeSelect(result.data.nodes ?? []);
  }

  setOutput("gatheringOutput", result);
});

document.getElementById("gatherBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const payload = {
    character_id: characterId,
    node_code: document.getElementById("nodeCode").value,
    client_position: {
      x: Number(document.getElementById("clientX").value),
      y: Number(document.getElementById("clientY").value),
    },
  };

  const result = await apiFetch("/api/gathering/attempt", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("gatheringOutput", result);
});

document.getElementById("listNpcBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const zoneId = Number(document.getElementById("zoneId").value);
  const result = await apiFetch(`/api/combat/npcs/${zoneId}`);

  if (result.ok) {
    updateNpcSelect(result.data.npcs ?? []);
  }

  setOutput("combatOutput", result);
});

document.getElementById("attackBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const abilityCode = document.getElementById("abilityCode").value;
  const payload = {
    character_id: characterId,
    npc_id: Number(document.getElementById("npcId").value),
    ...(abilityCode ? { ability_code: abilityCode } : {}),
  };

  const result = await apiFetch("/api/combat/attack", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("combatOutput", result);
});

document.getElementById("reviveBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const payload = { character_id: characterId };
  const result = await apiFetch("/api/combat/revive", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("combatOutput", result);
});

document.getElementById("listLootBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const result = await apiFetch(`/api/loot/containers/${characterId}`);
  if (result.ok) {
    updateLootSelect(result.data.containers ?? []);
  }
  setOutput("lootOutput", result);
});

document.getElementById("claimLootBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const containerId = Number(document.getElementById("containerId").value);
  const payload = { character_id: characterId };
  const result = await apiFetch(`/api/loot/containers/${containerId}/claim`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("lootOutput", result);
});

document.getElementById("betrayalStartBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const payload = {
    character_id: characterId,
    target_faction_id: Number(document.getElementById("betrayalTarget").value),
  };
  const result = await apiFetch("/api/betrayal/start", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("betrayalOutput", result);
});

document.getElementById("betrayalAdvanceBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const payload = { character_id: characterId };
  const result = await apiFetch("/api/betrayal/advance", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  setOutput("betrayalOutput", result);
});

document.getElementById("betrayalStatusBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const result = await apiFetch(`/api/betrayal/status/${characterId}`);
  setOutput("betrayalOutput", result);
});

document.getElementById("reputationBtn").addEventListener("click", async () => {
  if (!ensureToken()) return;
  const characterId = ensureCharacter();
  if (!characterId) return;

  const result = await apiFetch(`/api/reputation/${characterId}`);
  setOutput("reputationOutput", result);
});

loadReferenceData();
