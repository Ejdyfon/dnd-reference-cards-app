import { CLASS_LIST, apiKeyToClassKey } from './class-themes.js';

const API_ROOT = 'https://api.open5e.com/v2';
/** Works for spells, feats, creatures (Open5e nested document FK). */
const DOC_KEY_FILTER = 'document__key=srd-2024';
/** Works for items + magicitems (Open5e ignores document__key on these). */
const DOC_FILTER = 'document=srd-2024';

function isSrd2024(raw) {
  const key = raw?.document?.key ?? raw?.document;
  return key === 'srd-2024';
}

/** Defense in depth when an endpoint ignores its document query param. */
function filterSrd2024(results) {
  return (results || []).filter(isSrd2024);
}

export async function fetchAllPages(initialUrl) {
  const results = [];
  let url = initialUrl;

  while (url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    results.push(...data.results);
    url = data.next;
  }

  return results;
}

/* ── Spells ──────────────────────────────────────────────────── */
export async function fetchClassSpells(classApiKey) {
  const url = `${API_ROOT}/spells/?${DOC_KEY_FILTER}&classes__key=${classApiKey}&limit=100&ordering=level,name`;
  return filterSrd2024(await fetchAllPages(url));
}

export async function searchSpells(query) {
  const url = `${API_ROOT}/spells/?${DOC_KEY_FILTER}&search=${encodeURIComponent(query)}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export function formatLevel(level) {
  if (level === 0) return 'Cantrip';
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[level] ?? 'th';
  return `${level}${suffix}-level`;
}

export function formatCastTime(time, reactionCondition) {
  if (!time) return '—';
  const normalized = time.charAt(0).toUpperCase() + time.slice(1);
  if (reactionCondition) {
    return `${normalized}, ${reactionCondition}`;
  }
  return normalized;
}

export function formatComponents(spell) {
  const parts = [];
  if (spell.verbal) parts.push('Verbal');
  if (spell.somatic) parts.push('Somatic');
  if (spell.material) {
    const mat = spell.material_specified?.trim();
    parts.push(mat ? `Material (${mat})` : 'Material');
  }
  return parts.length ? parts.join(', ') : '—';
}

export function formatDuration(duration, concentration) {
  if (!duration) return '—';
  const d = duration.charAt(0).toUpperCase() + duration.slice(1);
  return concentration ? `${d} (Concentration)` : d;
}

export function normalizeSpell(raw) {
  return {
    cardType: 'spells',
    source: 'api',
    id: `spell:${raw.key}`,
    key: raw.key,
    name: raw.name,
    level: raw.level,
    levelLabel: formatLevel(raw.level),
    school: raw.school?.name ?? 'Unknown',
    range: raw.range_text || '—',
    castTime: formatCastTime(raw.casting_time, raw.reaction_condition),
    duration: formatDuration(raw.duration, raw.concentration),
    components: formatComponents(raw),
    desc: raw.desc ?? '',
    higherLevel: raw.higher_level ?? '',
    concentration: !!raw.concentration,
    ritual: !!raw.ritual,
    classes: (raw.classes ?? []).map((c) => c.name),
    customAccent: null,
    classKey: null,
  };
}

export function normalizeCustomSpell(form, id) {
  const level = parseInt(form.level, 10);
  const parts = [];
  if (form.verbal) parts.push('Verbal');
  if (form.somatic) parts.push('Somatic');
  if (form.material) {
    const mat = form.materialText?.trim();
    parts.push(mat ? `Material (${mat})` : 'Material');
  }

  const resolvedId = id || `spell:custom-${crypto.randomUUID()}`;
  return {
    cardType: 'spells',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    level,
    levelLabel: formatLevel(level),
    school: form.school,
    range: form.range.trim() || '—',
    castTime: form.castTime.trim() || 'Action',
    duration: form.duration.trim() || '—',
    components: parts.length ? parts.join(', ') : '—',
    desc: form.desc.trim(),
    higherLevel: form.higherLevel?.trim() ?? '',
    concentration: !!form.concentration,
    ritual: !!form.ritual,
    classes: [],
    customAccent: form.customAccent || null,
    classKey: form.classKey || 'custom',
  };
}

/* ── Classes / Class Skills ──────────────────────────────────── */
let cachedClasses = null;

export async function fetchClasses() {
  if (cachedClasses) return cachedClasses;
  const url = `${API_ROOT}/classes/?${DOC_KEY_FILTER}&limit=100`;
  cachedClasses = filterSrd2024(await fetchAllPages(url));
  return cachedClasses;
}

export async function fetchClassDetail(apiKey) {
  const res = await fetch(`${API_ROOT}/classes/${apiKey}/`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export function getBaseClasses(allClasses) {
  return allClasses.filter((c) => !c.subclass_of);
}

export function getSubclassesFor(allClasses, baseApiKey) {
  return allClasses.filter((c) => c.subclass_of?.key === baseApiKey);
}

function formatFeatureLevel(gainedAt) {
  if (!gainedAt?.length) return { level: null, levelLabel: 'Feature' };
  const levels = [...new Set(gainedAt.map((g) => g.level).filter((n) => n != null))].sort((a, b) => a - b);
  if (!levels.length) return { level: null, levelLabel: 'Feature' };
  if (levels.length === 1) return { level: levels[0], levelLabel: `Level ${levels[0]}` };
  return { level: levels[0], levelLabel: `Level ${levels.join(', ')}` };
}

export function normalizeClassFeature(raw, classKey, classLabel) {
  const { level, levelLabel } = formatFeatureLevel(raw.gained_at);
  return {
    cardType: 'class-skills',
    source: 'api',
    id: `class-skill:${raw.key}`,
    key: raw.key,
    name: raw.name,
    level,
    levelLabel,
    classKey,
    classLabel,
    featureType: raw.feature_type,
    desc: raw.desc ?? '',
    customAccent: null,
  };
}

export function normalizeCustomClassSkill(form, id) {
  const level = parseInt(form.level, 10) || 1;
  const resolvedId = id || `class-skill:custom-${crypto.randomUUID()}`;
  return {
    cardType: 'class-skills',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    level,
    levelLabel: form.levelLabel?.trim() || `Level ${level}`,
    classKey: form.classKey || 'custom',
    classLabel: CLASS_LIST.find((c) => c.key === form.classKey)?.label || 'Custom',
    featureType: 'CLASS_LEVEL_FEATURE',
    desc: form.desc.trim(),
    customAccent: form.customAccent || null,
  };
}

export async function fetchClassFeatures(apiKey, classKey) {
  const detail = await fetchClassDetail(apiKey);
  const label = detail.name;
  const parentKey = detail.subclass_of
    ? apiKeyToClassKey(detail.subclass_of.key)
    : classKey;
  return (detail.features || [])
    .filter((f) => f.feature_type === 'CLASS_LEVEL_FEATURE')
    .map((f) => normalizeClassFeature(f, parentKey, label))
    .sort((a, b) => (a.level ?? 99) - (b.level ?? 99) || a.name.localeCompare(b.name));
}

/* ── Feats ───────────────────────────────────────────────────── */
export async function fetchFeats() {
  const url = `${API_ROOT}/feats/?${DOC_KEY_FILTER}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export async function searchFeats(query) {
  const url = `${API_ROOT}/feats/?${DOC_KEY_FILTER}&search=${encodeURIComponent(query)}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export function normalizeFeat(raw) {
  const benefits = (raw.benefits || []).map((b) => b.desc).filter(Boolean);
  const descParts = [];
  if (raw.desc) descParts.push(raw.desc);
  benefits.forEach((b) => descParts.push(b));
  return {
    cardType: 'feats',
    source: 'api',
    id: `feat:${raw.key}`,
    key: raw.key,
    name: raw.name,
    type: raw.type || 'General',
    prerequisite: raw.prerequisite || '',
    desc: descParts.join('\n\n'),
    customAccent: null,
  };
}

export function normalizeCustomFeat(form, id) {
  const resolvedId = id || `feat:custom-${crypto.randomUUID()}`;
  return {
    cardType: 'feats',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    type: form.type?.trim() || 'General',
    prerequisite: form.prerequisite?.trim() || '',
    desc: form.desc.trim(),
    customAccent: form.customAccent || null,
  };
}

/* ── Equipment (items) ───────────────────────────────────────── */
export async function fetchEquipment() {
  // Open5e /items/ ignores document__key; use document= (yields 203 SRD 2024 items)
  const url = `${API_ROOT}/items/?${DOC_FILTER}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export async function searchEquipment(query) {
  const url = `${API_ROOT}/items/?${DOC_FILTER}&search=${encodeURIComponent(query)}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export function normalizeEquipment(raw) {
  const cost = raw.cost != null ? `${raw.cost} gp` : '—';
  const weight = raw.weight != null ? `${parseFloat(raw.weight)} ${raw.weight_unit || 'lb'}` : '—';
  return {
    cardType: 'equipment',
    source: 'api',
    id: `equipment:${raw.key}`,
    key: raw.key,
    name: raw.name,
    category: raw.category?.name || 'Item',
    cost,
    weight,
    desc: raw.desc ?? '',
    customAccent: null,
  };
}

export function normalizeCustomEquipment(form, id) {
  const resolvedId = id || `equipment:custom-${crypto.randomUUID()}`;
  return {
    cardType: 'equipment',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    category: form.category?.trim() || 'Item',
    cost: form.cost?.trim() || '—',
    weight: form.weight?.trim() || '—',
    desc: form.desc.trim(),
    customAccent: form.customAccent || null,
  };
}

/* ── Magic Items ─────────────────────────────────────────────── */
export async function fetchMagicItems() {
  // Same as items: document= filters; document__key does not
  const url = `${API_ROOT}/magicitems/?${DOC_FILTER}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export async function searchMagicItems(query) {
  const url = `${API_ROOT}/magicitems/?${DOC_FILTER}&search=${encodeURIComponent(query)}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export function normalizeMagicItem(raw) {
  let attunement = 'No';
  if (raw.requires_attunement) {
    attunement = raw.attunement_detail?.trim()
      ? `Yes (${raw.attunement_detail.trim()})`
      : 'Yes';
  }
  return {
    cardType: 'magic-items',
    source: 'api',
    id: `magic-item:${raw.key}`,
    key: raw.key,
    name: raw.name,
    rarity: raw.rarity?.name || 'Unknown',
    category: raw.category?.name || 'Item',
    attunement,
    desc: raw.desc ?? '',
    customAccent: null,
  };
}

export function normalizeCustomMagicItem(form, id) {
  const resolvedId = id || `magic-item:custom-${crypto.randomUUID()}`;
  return {
    cardType: 'magic-items',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    rarity: form.rarity?.trim() || 'Common',
    category: form.category?.trim() || 'Item',
    attunement: form.attunement?.trim() || 'No',
    desc: form.desc.trim(),
    customAccent: form.customAccent || null,
  };
}

/* ── Conditions ──────────────────────────────────────────────── */
export async function fetchConditions() {
  const url = `${API_ROOT}/conditions/?limit=100&ordering=name`;
  const all = await fetchAllPages(url);
  return all
    .map((raw) => {
      const desc = (raw.descriptions || []).find((d) => d.document === 'srd-2024');
      if (!desc) return null;
      return normalizeCondition({ ...raw, desc: desc.desc });
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function normalizeCondition(raw) {
  return {
    cardType: 'conditions',
    source: 'api',
    id: `condition:${raw.key}`,
    key: raw.key,
    name: raw.name,
    desc: raw.desc ?? '',
    customAccent: null,
  };
}

export function normalizeCustomCondition(form, id) {
  const resolvedId = id || `condition:custom-${crypto.randomUUID()}`;
  return {
    cardType: 'conditions',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    desc: form.desc.trim(),
    customAccent: form.customAccent || null,
  };
}

/* ── Monsters (creatures) ────────────────────────────────────── */
export async function fetchMonsters() {
  const url = `${API_ROOT}/creatures/?${DOC_KEY_FILTER}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

export async function searchMonsters(query) {
  const url = `${API_ROOT}/creatures/?${DOC_KEY_FILTER}&search=${encodeURIComponent(query)}&limit=100&ordering=name`;
  return filterSrd2024(await fetchAllPages(url));
}

function formatMod(n) {
  if (n == null || Number.isNaN(n)) return '+0';
  return n >= 0 ? `+${n}` : `${n}`;
}

function formatSpeed(speedAll, speed) {
  const s = speedAll || speed || {};
  const unit = s.unit || 'feet';
  const parts = [];
  if (s.walk) parts.push(`${s.walk} ${unit}`);
  if (s.fly) parts.push(`fly ${s.fly} ${unit}${s.hover ? ' (hover)' : ''}`);
  if (s.swim) parts.push(`swim ${s.swim} ${unit}`);
  if (s.burrow) parts.push(`burrow ${s.burrow} ${unit}`);
  if (s.climb) parts.push(`climb ${s.climb} ${unit}`);
  return parts.length ? parts.join(', ') : '—';
}

function formatSenses(raw) {
  const parts = [];
  if (raw.blindsight_range) parts.push(`Blindsight ${raw.blindsight_range} ft.`);
  if (raw.darkvision_range) parts.push(`Darkvision ${raw.darkvision_range} ft.`);
  if (raw.tremorsense_range) parts.push(`Tremorsense ${raw.tremorsense_range} ft.`);
  if (raw.truesight_range) parts.push(`Truesight ${raw.truesight_range} ft.`);
  if (raw.passive_perception != null) parts.push(`Passive Perception ${raw.passive_perception}`);
  return parts.join(', ');
}

function formatResistances(ri) {
  if (!ri) return {};
  return {
    immunities: ri.damage_immunities_display || (ri.damage_immunities || []).join(', '),
    resistances: ri.damage_resistances_display || (ri.damage_resistances || []).join(', '),
    vulnerabilities: ri.damage_vulnerabilities_display || (ri.damage_vulnerabilities || []).join(', '),
    conditionImmunities: ri.condition_immunities_display || (ri.condition_immunities || []).map((c) => c.name || c).join(', '),
  };
}

function formatSkills(skillBonuses) {
  if (!skillBonuses || typeof skillBonuses !== 'object') return '';
  return Object.entries(skillBonuses)
    .map(([k, v]) => `${k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())} ${formatMod(v)}`)
    .join(', ');
}

function formatSaves(saves) {
  if (!saves || typeof saves !== 'object') return '';
  const labels = { strength: 'Str', dexterity: 'Dex', constitution: 'Con', intelligence: 'Int', wisdom: 'Wis', charisma: 'Cha' };
  return Object.entries(saves)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${labels[k] || k} ${formatMod(v)}`)
    .join(', ');
}

function partitionActions(actions) {
  const traits = [];
  const acts = [];
  const bonus = [];
  const reactions = [];
  const legendary = [];

  const sorted = [...(actions || [])].sort(
    (a, b) => (a.order_in_statblock ?? 0) - (b.order_in_statblock ?? 0),
  );

  for (const a of sorted) {
    const entry = { name: a.name, desc: a.desc || '' };
    const t = (a.action_type || '').toUpperCase();
    // Prefer action_type — some ACTION rows also carry legendary_action_cost in Open5e
    if (t.includes('LEGENDARY')) {
      legendary.push({ ...entry, cost: a.legendary_action_cost || null });
      continue;
    }
    if (t.includes('BONUS')) bonus.push(entry);
    else if (t.includes('REACTION')) reactions.push(entry);
    else if (t.includes('TRAIT') || t.includes('SPECIAL')) traits.push(entry);
    else acts.push(entry);
  }
  return { traits, acts, bonus, reactions, legendary };
}

export function normalizeMonster(raw) {
  const abs = raw.ability_scores || {};
  const mods = raw.modifiers || {};
  const abilities = ['strength', 'dexterity', 'constitution', 'intelligence', 'wisdom', 'charisma'].map((k) => ({
    key: k.slice(0, 3).toUpperCase(),
    score: abs[k] ?? 10,
    mod: formatMod(mods[k] ?? Math.floor(((abs[k] ?? 10) - 10) / 2)),
  }));

  const fromTraits = (raw.traits || []).map((t) => ({ name: t.name, desc: t.desc || '' }));
  const partitioned = partitionActions(raw.actions);
  const traits = [...fromTraits, ...partitioned.traits];
  const ri = formatResistances(raw.resistances_and_immunities);

  const size = raw.size?.name || '';
  const type = raw.type?.name || '';
  const alignment = raw.alignment || '';
  const typeLineFmt = [size, type].filter(Boolean).join(' ') + (alignment ? `, ${alignment}` : '');

  return {
    cardType: 'monsters',
    source: 'api',
    id: `monster:${raw.key}`,
    key: raw.key,
    name: raw.name,
    typeLine: typeLineFmt,
    cr: raw.challenge_rating,
    crLabel: raw.challenge_rating != null ? `CR ${raw.challenge_rating}` : 'CR —',
    xp: raw.experience_points,
    ac: raw.armor_class,
    acDetail: raw.armor_detail || '',
    hp: raw.hit_points,
    hitDice: raw.hit_dice || '',
    speed: formatSpeed(raw.speed_all, raw.speed),
    abilities,
    saves: formatSaves(raw.saving_throws),
    skills: formatSkills(raw.skill_bonuses),
    senses: formatSenses(raw),
    languages: raw.languages?.as_string || '',
    ...ri,
    traits,
    actions: partitioned.acts,
    bonusActions: partitioned.bonus,
    reactions: partitioned.reactions,
    legendaryActions: partitioned.legendary,
    customAccent: null,
  };
}

export function normalizeCustomMonster(form, id) {
  const resolvedId = id || `monster:custom-${crypto.randomUUID()}`;
  const score = (n) => parseInt(n, 10) || 10;
  const modOf = (s) => formatMod(Math.floor((s - 10) / 2));
  const keys = [
    ['str', 'STR'], ['dex', 'DEX'], ['con', 'CON'],
    ['int', 'INT'], ['wis', 'WIS'], ['cha', 'CHA'],
  ];
  const abilities = keys.map(([f, label]) => {
    const s = score(form[f]);
    return { key: label, score: s, mod: modOf(s) };
  });

  const parseSections = (text) => {
    if (!text?.trim()) return [];
    return text.split(/\n\s*\n/).map((block) => {
      const lines = block.trim().split('\n');
      const name = lines[0].replace(/^\*\*?|\*\*?$/g, '').trim();
      const desc = lines.slice(1).join('\n').trim() || lines[0];
      if (lines.length === 1) return { name: name.split(/[.:]/)[0], desc: block.trim() };
      return { name, desc };
    });
  };

  return {
    cardType: 'monsters',
    source: 'custom',
    id: resolvedId,
    key: resolvedId,
    name: form.name.trim(),
    typeLine: form.typeLine?.trim() || '',
    cr: form.cr,
    crLabel: form.cr != null && form.cr !== '' ? `CR ${form.cr}` : 'CR —',
    xp: form.xp || null,
    ac: form.ac || '—',
    acDetail: form.acDetail || '',
    hp: form.hp || '—',
    hitDice: form.hitDice || '',
    speed: form.speed?.trim() || '—',
    abilities,
    saves: form.saves?.trim() || '',
    skills: form.skills?.trim() || '',
    senses: form.senses?.trim() || '',
    languages: form.languages?.trim() || '',
    immunities: form.immunities?.trim() || '',
    resistances: form.resistances?.trim() || '',
    vulnerabilities: form.vulnerabilities?.trim() || '',
    conditionImmunities: form.conditionImmunities?.trim() || '',
    traits: parseSections(form.traits),
    actions: parseSections(form.actions),
    bonusActions: parseSections(form.bonusActions),
    reactions: parseSections(form.reactions),
    legendaryActions: parseSections(form.legendaryActions),
    customAccent: form.customAccent || null,
  };
}
